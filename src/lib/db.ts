import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const getDatabaseUrl = () => {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Si l'URL utilise le pooler de Supabase ou le port 6543 (Transaction Mode)
  // et ne contient pas déjà pgbouncer=true, on l'ajoute dynamiquement.
  if ((url.includes('pooler.supabase.com') || url.includes(':6543')) && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}pgbouncer=true`;
  }
  return url;
};

const databaseUrl = getDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {})
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db