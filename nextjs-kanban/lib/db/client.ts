import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  let prisma: PrismaClient | undefined

if (process.env.NODE_ENV === 'production') {
  prisma = globalForPrisma.prisma
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    })
  }
  prisma = globalForPrisma.prisma
}

export default prisma
