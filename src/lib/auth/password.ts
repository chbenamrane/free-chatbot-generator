// Password hashing with argon2id (the algorithm recommended by OWASP).
// The password itself is NEVER stored: only its hash, which cannot be reversed.

import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id settings (19 MiB of memory, 2 passes).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false; // invalid hash: refuse without crashing
  }
}

// Fake hash used when the e-mail does not exist: the computation still runs, so the response
// takes the same time (otherwise an attacker could guess which e-mails exist).
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  dummyHash ??= hashPassword("dummy-password-to-equalize-response-times");
  return dummyHash;
}

// Minimal rule for the admin password: length first.
export function isStrongPassword(password: string) {
  return password.length >= 12 && password.length <= 128;
}
