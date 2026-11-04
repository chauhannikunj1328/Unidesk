import { prisma } from "./prisma.js";

/** True when the database answers. */
export async function databaseIsUp() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
