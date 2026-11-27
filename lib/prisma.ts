import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const pooledDatabaseUrl =
  process.env.DATABASE_URL_POOLED || process.env.SMARTATTEND_DATABASE_URL_POOLED;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(pooledDatabaseUrl
      ? { datasources: { db: { url: pooledDatabaseUrl } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
