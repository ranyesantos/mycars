import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'vehicles.db')

let db: SqlJsDatabase | null = null

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  const SQL = await initSqlJs()

  try {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } catch {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')
  return db
}

export function saveDb(): void {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}
