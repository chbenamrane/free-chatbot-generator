// Command line access to the API key safety net.
//   npm run keys:backup                 write a snapshot of all provider keys to ./backups
//   npm run keys:restore                restore from the latest snapshot (keeps keys that already exist)
//   npm run keys:restore -- <file>      restore from a given file
//   npm run keys:restore -- --overwrite replace existing keys too
//   npm run keys:restore -- --map <oldBotId>=<newBotId>   restore the keys of a deleted chatbot into a new one

import "dotenv/config";
import { db } from "../src/lib/db";
import { latestBackupFile, restoreKeys, snapshotKeys } from "../src/lib/backup/keys";

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === "backup") {
    const file = await snapshotKeys("manual");
    console.log(file ? `Saved: ${file}` : "No API key to back up.");
  } else if (command === "restore") {
    const overwrite = args.includes("--overwrite");
    const botMap = Object.fromEntries(args.flatMap((a, i) => (args[i - 1] === "--map" ? [a.split("=") as [string, string]] : [])));
    const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--map") ?? (await latestBackupFile());
    if (!file) throw new Error("No backup file found in ./backups.");
    const report = await restoreKeys(file, { overwrite, botMap });
    console.log(`Restored from ${file}`);
    console.log(report);
    if (!report.secretMatches) console.warn("Warning: APP_SECRET differs from the one used for this backup, restored keys will be unreadable.");
  } else {
    console.log("Usage: keys backup | keys restore [file] [--overwrite]");
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
