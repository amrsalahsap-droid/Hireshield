import { PrismaClient } from '@prisma/client';

// Add debug logging
console.log('[DEBUG] Initializing Prisma client...');
console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a new PrismaClient if one doesn't exist
function createPrismaClient(): PrismaClient {
  console.log('[DEBUG] Creating new PrismaClient instance');
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
    console.log('[DEBUG] PrismaClient created successfully');
    return client;
  } catch (error) {
    console.error('[DEBUG] Failed to create PrismaClient:', error);
    throw error;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  console.log('[DEBUG] Prisma client stored in global');
}

// Verify the client is properly initialized
if (!prisma) {
  console.error('[DEBUG] CRITICAL: Prisma client is undefined after initialization');
} else {
  console.log('[DEBUG] Prisma client initialized successfully');
  console.log('[DEBUG] Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
}
