import { defineConfig, env } from '@prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
  migrate: {
    async adapter(env) {
      return new PrismaPg({ connectionString: env.DATABASE_URL })
    },
  },
})
