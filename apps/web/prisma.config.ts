import { defineConfig } from "prisma/config";

// Prisma 6+ reads this file automatically (replaces `package.json#prisma`).
// Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
