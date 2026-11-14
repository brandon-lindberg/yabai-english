import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrismaObj = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const schema = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).searchParams.get("schema") ?? "public" : "public";
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Keep raw aggregates in the same schema as Prisma's qualified model reads.
    options: `-c search_path=${(`"${schema.replaceAll('"', '""')}"`).replace(/[\\\s]/g, "\\$&")}`,
  }, { schema });
  // Query logging is opt-in (PRISMA_LOG_QUERIES=true) because it floods the
  // dev terminal and the browser console via Next's server-log forwarding.
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? process.env.PRISMA_LOG_QUERIES === "true"
          ? ["query", "error", "warn"]
          : ["error", "warn"]
        : ["error"],
  });
}

export const prisma =
  globalForPrismaObj.prisma ?? createPrismaClient();

// Production page/API bundles also have separate module caches. Share the client
// (and its pool) for the process lifetime, not just across development reloads.
globalForPrismaObj.prisma = prisma;
