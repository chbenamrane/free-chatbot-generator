// Safety net for API keys. Keys live (encrypted) in the BotProvider table; this module writes them to JSON files
// in ./backups (git-ignored) so a deleted chatbot, a removed provider or a reset database never loses them.
// The files only contain the already-encrypted keys: they are useless without APP_SECRET, so keep a copy of that too.

import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";

export const BACKUP_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.KEY_BACKUP_DIR || "backups");
const KEEP = 40; // number of snapshots kept

type KeyRow = {
  botId: string;
  botName: string;
  provider: string;
  enabled: boolean;
  sortOrder: number;
  model: string;
  keyEnc: string | null;
  baseUrl: string | null;
};

export type KeyBackup = { version: 1; createdAt: string; reason: string; secretFingerprint: string; rows: KeyRow[] };

// First characters of a hash of APP_SECRET: lets a restore warn when the secret is not the one used for the backup.
export const secretFingerprint = () => createHash("sha256").update(process.env.APP_SECRET ?? "").digest("hex").slice(0, 8);

export async function exportKeys(reason: string): Promise<KeyBackup> {
  const providers = await db.botProvider.findMany({ include: { bot: { select: { name: true } } }, orderBy: [{ botId: "asc" }, { sortOrder: "asc" }] });
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    reason,
    secretFingerprint: secretFingerprint(),
    rows: providers.map((p) => ({
      botId: p.botId,
      botName: p.bot.name,
      provider: p.provider,
      enabled: p.enabled,
      sortOrder: p.sortOrder,
      model: p.model,
      keyEnc: p.keyEnc,
      baseUrl: p.baseUrl,
    })),
  };
}

// Writes a snapshot file; returns its path, or null when there is nothing worth saving.
export async function snapshotKeys(reason: string): Promise<string | null> {
  const backup = await exportKeys(reason);
  if (!backup.rows.some((r) => r.keyEnc)) return null;
  await mkdir(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `keys-${backup.createdAt.replace(/[:.]/g, "-")}-${reason.replace(/[^a-z0-9-]/gi, "")}.json`);
  await writeFile(file, JSON.stringify(backup, null, 2), { mode: 0o600 });
  await prune();
  return file;
}

// Never let a failing backup block the action it protects (read-only disk, serverless...).
export async function snapshotKeysQuietly(reason: string) {
  try {
    await snapshotKeys(reason);
  } catch (error) {
    console.warn("Key backup skipped:", error instanceof Error ? error.message : error);
  }
}

async function prune() {
  const files = (await readdir(BACKUP_DIR)).filter((f) => f.startsWith("keys-") && f.endsWith(".json")).sort();
  for (const old of files.slice(0, Math.max(0, files.length - KEEP))) await unlink(path.join(BACKUP_DIR, old)).catch(() => undefined);
}

export async function latestBackupFile(): Promise<string | null> {
  try {
    const files = (await readdir(BACKUP_DIR)).filter((f) => f.startsWith("keys-") && f.endsWith(".json")).sort();
    return files.length ? path.join(BACKUP_DIR, files[files.length - 1]) : null;
  } catch {
    return null;
  }
}

export type RestoreReport = { restored: number; skippedMissingBot: number; skippedExisting: number; secretMatches: boolean };

// Puts back the keys of a backup. By default a provider that already has a key is left alone ("overwrite" replaces it).
export async function restoreKeys(file: string, options: { overwrite?: boolean; botMap?: Record<string, string> } = {}): Promise<RestoreReport> {
  const backup = JSON.parse(await readFile(file, "utf8")) as KeyBackup;
  if (backup.version !== 1 || !Array.isArray(backup.rows)) throw new Error("Unrecognized backup file.");

  const report: RestoreReport = { restored: 0, skippedMissingBot: 0, skippedExisting: 0, secretMatches: backup.secretFingerprint === secretFingerprint() };
  for (const source of backup.rows) {
    // A chatbot that was deleted and recreated has a new id: --map oldId=newId points its keys at the new one.
    const row = { ...source, botId: options.botMap?.[source.botId] ?? source.botId };
    if (!(await db.bot.findUnique({ where: { id: row.botId }, select: { id: true } }))) {
      report.skippedMissingBot++;
      continue;
    }
    const existing = await db.botProvider.findUnique({ where: { botId_provider: { botId: row.botId, provider: row.provider } } });
    if (existing?.keyEnc && !options.overwrite) {
      report.skippedExisting++;
      continue;
    }
    const data = { enabled: row.enabled, sortOrder: row.sortOrder, model: row.model, keyEnc: row.keyEnc, baseUrl: row.baseUrl };
    if (existing) await db.botProvider.update({ where: { id: existing.id }, data });
    else await db.botProvider.create({ data: { botId: row.botId, provider: row.provider, ...data } });
    report.restored++;
  }
  return report;
}
