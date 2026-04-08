import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/kanban'

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma: PrismaClient =
  globalThis.prismaClient ??
  (new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }) as any)

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClient = prisma
}

export default prisma
