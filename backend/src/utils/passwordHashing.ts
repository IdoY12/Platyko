import bcrypt from "bcrypt";

const BCRYPT_COST_FACTOR = 10;

/**
 * Compared against when no real hash exists (unknown email, social-only account) so a request for a
 * missing account costs the same bcrypt time as one for an existing account — no timing enumeration.
 */
const TIMING_EQUALIZER_HASH = bcrypt.hashSync("timing-equalizer", BCRYPT_COST_FACTOR);

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST_FACTOR);
}

export async function comparePassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/** Burns one bcrypt compare so the caller's failure path takes as long as a real comparison. */
export async function equalizeCompareTiming(): Promise<void> {
  await bcrypt.compare("timing-equalizer", TIMING_EQUALIZER_HASH);
}
