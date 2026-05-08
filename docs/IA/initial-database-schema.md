## 3. Database Schema
 
```sql
-- Vehicles found via FIPE code search
CREATE TABLE IF NOT EXISTS vehicles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fipe_code     TEXT NOT NULL UNIQUE,
  vehicle_type  TEXT NOT NULL CHECK(vehicle_type IN ('cars', 'trucks', 'motorcycles')),
  brand         TEXT,
  model         TEXT,
  favorited     INTEGER NOT NULL DEFAULT 0,
  fetched_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- Available years and fuel types per FIPE code
CREATE TABLE IF NOT EXISTS vehicle_years (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  year_code   TEXT NOT NULL,        -- e.g. "2012-1"
  year_label  TEXT NOT NULL,        -- e.g. "2012 Gasolina"
  price       TEXT,                 -- latest FIPE price, e.g. "R$ 22.000,00"
  price_updated_at DATETIME
);
 
-- Optional details fetched via web scraping
CREATE TABLE IF NOT EXISTS scraping_details (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id          INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  source_url          TEXT NOT NULL,
  engine              TEXT,
  power_hp            TEXT,
  torque              TEXT,
  transmission        TEXT,
  fuel_type           TEXT,
  consumption_city    TEXT,
  consumption_highway TEXT,
  raw_data            TEXT,         -- full JSON dump of all scraped fields
  scraped_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- Job queue table (used in Phase 2 if not using Redis/BullMQ)
CREATE TABLE IF NOT EXISTS jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,        -- 'fipe_fetch' | 'scrape' | 'price_update'
  payload     TEXT NOT NULL,        -- JSON
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | processing | done | failed
  attempts    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- Cron run history (Phase 3)
CREATE TABLE IF NOT EXISTS cron_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL,
  vehicles_updated INTEGER,
  status        TEXT NOT NULL,
  ran_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
 