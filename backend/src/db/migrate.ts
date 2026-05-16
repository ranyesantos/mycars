import { getDb } from './index.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runMigrations(): void {
  const db = getDb()

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec(sql)
    console.log(`[migrate] Ran: ${file}`)
  }

  console.log('[migrate] All migrations applied.')
}

runMigrations()
