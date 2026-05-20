import { getDb } from './index'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runMigrations(): void {
  const db = getDb()

  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    name    TEXT PRIMARY KEY,
    ran_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`)

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map((r: unknown) => (r as { name: string }).name),
  )

  for (const file of files) {
    if (applied.has(file)) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec(sql)
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file)
    console.log(`[migrate] Ran: ${file}`)
  }

  console.log('[migrate] All migrations applied.')
}

runMigrations()
