import { PrismaClient } from "@prisma/client";

// Uma única instância para toda a aplicação.
// Em dev com --watch, guardamos no globalThis para não abrir uma conexão nova a cada reload.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
