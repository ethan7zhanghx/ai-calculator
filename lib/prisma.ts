import { PrismaClient } from "@prisma/client";

// This is a declaration for the global object to avoid TypeScript errors.
declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  // In production, use a single instance.
  prisma = new PrismaClient();
} else {
  // In development, to prevent connection issues in unstable networks,
  // we will not use a single instance. Instead, we will create a new one on each call.
  // This is an anti-pattern for performance but necessary for reliability here.
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ["query", "error", "warn"],
    });
  }
  prisma = global.prisma;
}

/**
 * In development, this function returns a NEW PrismaClient instance for every call
 * to bypass connection pooling issues in unstable network environments.
 * In production, it returns the single, shared instance.
 */
export const getPrismaClient = (): PrismaClient => {
  if (process.env.NODE_ENV === 'development') {
    return new PrismaClient({
      log: ["query", "error", "warn"],
    });
  }
  return prisma;
};

// We still export the single instance for parts of the app that might rely on it,
// but we will transition to using getPrismaClient() where connection issues occur.
export { prisma };
