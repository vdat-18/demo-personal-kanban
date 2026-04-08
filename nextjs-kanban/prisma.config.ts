import { defineConfig } from 'prisma/config'

import { PrismaClient } from '@prisma/client'

const client = new PrismaClient({
  adapter: 'prisma-client',
})

export default defineConfig({
  client,
})
