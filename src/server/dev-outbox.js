import { prisma } from "./prisma.js";

/** Newest emails first, for the development-only outbox page. */
export const listRecentEmails = (limit = 30) => prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
