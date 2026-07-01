import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

let db: PrismaClient | null = null

export function getDb(): PrismaClient {
  if (db) return db

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const adapter = new PrismaPg({ connectionString: url })
  db = new PrismaClient({ adapter })
  return db
}
