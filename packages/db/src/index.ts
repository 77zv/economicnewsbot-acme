import { PrismaClient } from "../generated/prisma/index.js";

import { env } from "@repo/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    errorFormat: 'pretty',
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
export * from "../generated/prisma/index.js";
