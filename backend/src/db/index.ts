import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import 'dotenv/config'

let db: PrismaClient | null = null

export function getDb(): PrismaClient {
  if (db) return db

  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
  db = new PrismaClient({ adapter })
  return db
}
