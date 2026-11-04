import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/** The one raw Prisma client. Import it only from src/server/*. Routes and actions use withOrg(session). */
export const prisma = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
