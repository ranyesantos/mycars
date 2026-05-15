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

CREATE TABLE IF NOT EXISTS vehicle_years (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  year_code   TEXT NOT NULL,
  year_label  TEXT NOT NULL,
  price       TEXT,
  price_updated_at DATETIME
);

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
  raw_data            TEXT,
  scraped_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,
  payload     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  attempts    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cron_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL,
  vehicles_updated INTEGER,
  status        TEXT NOT NULL,
  ran_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
