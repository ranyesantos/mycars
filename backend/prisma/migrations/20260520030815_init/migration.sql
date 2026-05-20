-- CreateTable
CREATE TABLE "vehicles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fipe_code" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "favorited" INTEGER NOT NULL DEFAULT 0,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vehicle_years" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER NOT NULL,
    "year_code" TEXT NOT NULL,
    "year_label" TEXT NOT NULL,
    "price" TEXT,
    "fuel" TEXT,
    "reference_month" TEXT,
    "fuel_acronym" TEXT,
    "fetched_at" DATETIME,
    "price_updated_at" DATETIME,
    CONSTRAINT "vehicle_years_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scraping_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_id" INTEGER NOT NULL,
    "source_url" TEXT NOT NULL,
    "engine" TEXT,
    "power_hp" TEXT,
    "torque" TEXT,
    "transmission" TEXT,
    "fuel_type" TEXT,
    "consumption_city" TEXT,
    "consumption_highway" TEXT,
    "raw_data" TEXT,
    "scraped_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scraping_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cron_runs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "vehicles_updated" INTEGER,
    "status" TEXT NOT NULL,
    "ran_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_fipe_code_key" ON "vehicles"("fipe_code");
