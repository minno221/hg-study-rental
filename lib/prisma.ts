import { PrismaClient } from "@prisma/client";
import { pickDbUrl } from "@/lib/db-url";

// 개발 서버가 다시 로드될 때마다 PrismaClient가 새로 만들어지는 걸 막아요
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: pickDbUrl(),
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
