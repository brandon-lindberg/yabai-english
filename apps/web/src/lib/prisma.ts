import { PrismaClient } from "@prisma/client";

const globalForPrismaObj = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrismaObj.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaObj.prisma = prisma;
}
