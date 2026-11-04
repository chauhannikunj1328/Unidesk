import bcrypt from "bcryptjs";

const COST = 12;
// A real hash, so "no such account" costs the same time as "wrong password" (no timing hint).
let dummyHash;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("not-a-real-password-for-timing", COST));

export const hashPassword = (password) => bcrypt.hash(password, COST);

/** @param {string} password @param {string | null | undefined} hash */
export async function verifyPassword(password, hash) {
  const ok = await bcrypt.compare(password, hash || getDummyHash());
  return Boolean(hash) && ok;
}
