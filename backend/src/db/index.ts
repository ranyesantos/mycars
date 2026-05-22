import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import 'dotenv/config'

let db: PrismaClient | null = null

export function getDb(): PrismaClient {
  if (db) return db

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const adapter = new PrismaBetterSqlite3({ url })
  db = new PrismaClient({ adapter })
  return db
}
