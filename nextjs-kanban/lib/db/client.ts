import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient
}

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/kanban'

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma: PrismaClient =
  globalForPrisma.prismaClient ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaClient = prisma
}

export default prisma
