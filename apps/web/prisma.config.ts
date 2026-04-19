import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 config — connection URL for CLI commands (migrate, db push, studio) lives here.
// Runtime connections use a driver adapter passed to PrismaClient directly.
// Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference
export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
