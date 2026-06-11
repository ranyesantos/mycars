import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DB_PATH = path.resolve(__dirname, '..', '..', 'test.db')
// SQLite file URL needs forward slashes on Windows
const TEST_DB_URL = `file:${TEST_DB_PATH.replace(/\\/g, '/')}`

export function createTestDb(): PrismaClient {
  // Sync the schema directly to the test database (fresh DB each run)
  execSync('npx prisma db push --accept-data-loss', {
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  })

  const adapter = new PrismaBetterSqlite3({ url: TEST_DB_URL })
  return new PrismaClient({ adapter })
}

export async function clearTestDb(db: PrismaClient): Promise<void> {
  await db.job.deleteMany()
  await db.technicalSpecs.deleteMany()
  await db.vehicleYear.deleteMany()
  await db.vehicle.deleteMany()
}

export async function closeTestDb(db: PrismaClient | undefined): Promise<void> {
  if (db) {
    await db.$disconnect()
  }
  try { fs.unlinkSync(TEST_DB_PATH) } catch { /* ignore */ }
  try { fs.unlinkSync(TEST_DB_PATH + '-journal') } catch { /* ignore */ }
}
