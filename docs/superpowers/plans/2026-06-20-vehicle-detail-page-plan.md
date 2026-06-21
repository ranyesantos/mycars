# Vehicle Detail Page & Technical Specs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-page vehicle detail view with composable technical specs sections and expand the database + scraper to cover ~70 spec columns.

**Architecture:** Backend gets a new read-only `vehicle-detail` slice (repository + route), the existing `scrape-details` types/repository/worker are updated for the expanded schema, and the frontend gets a `vehicle-detail` slice with sub-components per spec section, driven by a static config.

**Tech Stack:** Express + Prisma + SQLite (backend), React + Vite + react-router-dom + shadcn/ui + TanStack Query (frontend)

## Global Constraints

- All files read in full before editing
- Never use `any` in TypeScript
- All async functions have explicit return types
- Always use named exports (except React components default export)
- Props always typed with an explicit interface
- Presentational components receive data as props, never fetch inside
- Every async component handles loading, error, and success states
- Use shadcn Skeleton for loading, not spinners
- SQLite via Prisma — NO `ALTER COLUMN` / `DROP COLUMN` / `RENAME COLUMN` support
- Prisma migrate for SQLite requires a full table rebuild approach for schema changes
- Tests use vitest + supertest, integration test pattern from existing slices
- No "Co-authored-by: Claude Code" in commit messages

---

## File Structure

```
# Modified files
backend/prisma/schema.prisma                              — Full TechnicalSpecs column expansion
backend/prisma/migrations/<new>/migration.sql              — Table rebuild migration
backend/src/features/scrape-details/scraper/scraper.types.ts — Expanded TypedFields → FullSpecFields
backend/src/features/scrape-details/scraper/scraper.ts     — Expanded LABEL_TO_FIELD map
backend/src/features/scrape-details/scrapeDetails.repository.ts — Updated saveSpecsAndMarkDone signature
backend/src/features/scrape-details/worker/worker.ts       — Updated saveSpecs call
backend/src/server.ts                                      — Mount new vehicleDetail routes

# New files (backend)
backend/src/features/vehicle-detail/index.ts
backend/src/features/vehicle-detail/vehicleDetail.repository.ts
backend/src/features/vehicle-detail/vehicleDetail.routes.ts
backend/src/features/vehicle-detail/vehicleDetail.test.ts

# New files (frontend)
frontend/src/services/vehicleDetailApi.ts
frontend/src/hooks/useVehicleSpecs.ts
frontend/src/features/vehicle-detail/index.ts
frontend/src/features/vehicle-detail/VehicleDetailPage.tsx
frontend/src/features/vehicle-detail/VehicleHero.tsx
frontend/src/features/vehicle-detail/VehicleTechnicalSpecs.tsx
frontend/src/features/vehicle-detail/spec-sections.ts
frontend/src/features/vehicle-detail/sections/SpecSection.tsx
frontend/src/features/vehicle-detail/sections/SpecItem.tsx
frontend/src/features/vehicle-detail/sections/PerformanceSection.tsx
frontend/src/features/vehicle-detail/sections/EngineSection.tsx
frontend/src/features/vehicle-detail/sections/TransmissionSection.tsx
frontend/src/features/vehicle-detail/sections/DimensionsSection.tsx
frontend/src/features/vehicle-detail/sections/ConsumptionSection.tsx
frontend/src/features/vehicle-detail/sections/BrakesSection.tsx
frontend/src/features/vehicle-detail/sections/SuspensionSection.tsx
frontend/src/features/vehicle-detail/sections/AerodynamicsSection.tsx
frontend/src/features/vehicle-detail/sections/SteeringSection.tsx
frontend/src/features/vehicle-detail/sections/GeneralSection.tsx

# Modified files (frontend)
frontend/src/features/favorite-vehicle/VehicleCard.tsx     — Add "Ver Detalhes" link
frontend/src/App.tsx                                       — Add /vehicle/:fipeCode/:yearCode route
```

---

### Task 1: Expand `TypedFields` in scraper types

**Files:**
- Modify: `backend/src/features/scrape-details/scraper/scraper.types.ts`

**Interfaces:**
- Produces: `FullSpecFields` interface with all ~70 columns (replaces `TypedFields`), `ScrapedVehicleDetails` extends `FullSpecFields`

- [ ] **Step 1: Read the current file**

```bash
cat backend/src/features/scrape-details/scraper/scraper.types.ts
```

- [ ] **Step 2: Replace content with expanded types**

```ts
/** All scraped spec fields — one property per known source label. */
export interface FullSpecFields {
  // General
  year: string | null
  fuel: string | null
  configuration: string | null
  warranty: string | null
  generation: string | null
  seats: string | null
  platform: string | null
  doors: string | null
  size: string | null
  origin: string | null
  propulsion: string | null
  series: string | null

  // Performance
  acceleration_0_100: string | null
  top_speed_g: string | null
  top_speed_e: string | null
  weight_power_ratio: string | null
  weight_torque_ratio: string | null
  specific_power: string | null
  specific_torque: string | null

  // Engine
  engine_code: string | null
  unit_displacement: string | null
  displacement: string | null
  bore: string | null
  stroke: string | null
  cylinders: string | null
  cylinders_arrangement: string | null
  valves_per_cylinder: string | null
  valve_control: string | null
  valve_variation: string | null
  tappets: string | null
  aspiration: string | null
  feeding: string | null
  installation: string | null
  arrangement: string | null
  compression_ratio: string | null
  drive_actuation: string | null
  power_hp_g: string | null
  power_hp_e: string | null
  max_power_rpm: string | null
  torque_g: string | null
  torque_e: string | null
  max_torque_rpm: string | null

  // Transmission
  coupling: string | null
  gearbox: string | null
  gearbox_code: string | null
  gears: string | null
  traction: string | null

  // Dimensions
  height: string | null
  width: string | null
  length: string | null
  wheelbase: string | null
  front_track: string | null
  rear_track: string | null
  weight: string | null
  payload: string | null
  trunk_capacity: string | null
  fuel_tank: string | null

  // Brakes
  front_brakes: string | null
  rear_brakes: string | null
  sidewall_height: string | null

  // Aerodynamics
  frontal_area: string | null
  corrected_frontal_area: string | null
  drag_coefficient: string | null

  // Steering
  steering_assist: string | null
  turning_diameter: string | null

  // Suspension
  front_suspension: string | null
  rear_suspension: string | null
  elastic_element: string | null

  // Consumption & Autonomy
  city_consumption_g: string | null
  highway_consumption_g: string | null
  city_range_g: string | null
  highway_range_g: string | null
  city_consumption_e: string | null
  highway_consumption_e: string | null
  city_range_e: string | null
  highway_range_e: string | null
}

/** The scraper's return type — all known fields + rawData catch-all. */
export interface ScrapedVehicleDetails extends FullSpecFields {
  rawData: string
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd backend && npx tsc --noEmit src/features/scrape-details/scraper/scraper.types.ts
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/features/scrape-details/scraper/scraper.types.ts
git commit -m "refactor: expand ScrapedVehicleDetails to full ~70 column type"
```

---

### Task 2: Update scraper LABEL_TO_FIELD map

**Files:**
- Modify: `backend/src/features/scrape-details/scraper/scraper.ts`

**Interfaces:**
- Consumes: `FullSpecFields` from Task 1
- Produces: Updated `scrapeFromHtml` returning all mapped fields

- [ ] **Step 1: Read the current scraper file**

```bash
cat backend/src/features/scrape-details/scraper/scraper.ts
```

- [ ] **Step 2: Replace the LABEL_TO_FIELD map and TypedFields initialization**

The current import stays: `import type { ScrapedVehicleDetails, FullSpecFields } from './scraper.types'`

Replace the `LABEL_TO_FIELD` constant with:

```ts
const LABEL_TO_FIELD: Record<string, keyof FullSpecFields> = {
  // General
  'Ano': 'year',
  'Combustível': 'fuel',
  'Configuração': 'configuration',
  'Garantia': 'warranty',
  'Geração': 'generation',
  'Lugares': 'seats',
  'Plataforma': 'platform',
  'Portas': 'doors',
  'Porte': 'size',
  'Procedência': 'origin',
  'Propulsão': 'propulsion',
  'Série': 'series',

  // Performance
  'Aceleração 0-100 km/h': 'acceleration_0_100',
  'Velocidade máxima': 'top_speed_g',
  'Velocidade máxima (E)': 'top_speed_e',
  'Peso/potência': 'weight_power_ratio',
  'Peso/torque': 'weight_torque_ratio',
  'Potência específica': 'specific_power',
  'Torque específico': 'specific_torque',

  // Engine
  'Código do motor': 'engine_code',
  'Cilindrada unitária': 'unit_displacement',
  'Deslocamento': 'displacement',
  'Diâmetro do cilindro': 'bore',
  'Curso do pistão': 'stroke',
  'Cilindros': 'cylinders',
  'Válvulas por cilindro': 'valves_per_cylinder',
  'Comando de válvulas': 'valve_control',
  'Variação do comando': 'valve_variation',
  'Tuchos': 'tappets',
  'Aspiração': 'aspiration',
  'Alimentação': 'feeding',
  'Instalação': 'installation',
  'Disposição': 'arrangement',
  'Razão de compressão': 'compression_ratio',
  'Acionam. do comando': 'drive_actuation',
  'Potência máxima': 'power_hp_g',
  'Potência máxima (E)': 'power_hp_e',
  'Regime potência máx.': 'max_power_rpm',
  'Torque máximo': 'torque_g',
  'Torque máximo (E)': 'torque_e',
  'Regime torque máx.': 'max_torque_rpm',

  // Transmission
  'Acoplamento': 'coupling',
  'Câmbio': 'gearbox',
  'Código do câmbio': 'gearbox_code',
  'Marchas': 'gears',
  'Tração': 'traction',

  // Dimensions
  'Altura': 'height',
  'Largura': 'width',
  'Comprimento': 'length',
  'Distância entre-eixos': 'wheelbase',
  'Bitola dianteira': 'front_track',
  'Bitola traseira': 'rear_track',
  'Peso': 'weight',
  'Carga útil': 'payload',
  'Porta-malas': 'trunk_capacity',
  'Tanque de combustível': 'fuel_tank',

  // Brakes
  'Dianteiros': 'front_brakes',
  'Traseiros': 'rear_brakes',
  'Altura do flanco': 'sidewall_height',

  // Aerodynamics
  'Área frontal (A)': 'frontal_area',
  'Área frontal corrigida': 'corrected_frontal_area',
  'Coef. de arrasto (Cx)': 'drag_coefficient',

  // Steering
  'Assistência': 'steering_assist',
  'Diâmetro de giro': 'turning_diameter',

  // Suspension
  'Dianteira': 'front_suspension',
  'Traseira': 'rear_suspension',
  'Elemento elástico': 'elastic_element',

  // Consumption & Autonomy
  'Urbano (G)': 'city_consumption_g',
  'Rodoviário (G)': 'highway_consumption_g',
  'Urbana (G)': 'city_range_g',
  'Rodoviária (G)': 'highway_range_g',
  'Urbano (E)': 'city_consumption_e',
  'Rodoviário (E)': 'highway_consumption_e',
  'Urbana (E)': 'city_range_e',
  'Rodoviária (E)': 'highway_range_e',
}
```

Replace the `typed` initialization block (the `const typed: TypedFields = { ... }` section) with:

```ts
const initNull = (): FullSpecFields => ({
  year: null, fuel: null, configuration: null, warranty: null, generation: null,
  seats: null, platform: null, doors: null, size: null, origin: null,
  propulsion: null, series: null,
  acceleration_0_100: null, top_speed_g: null, top_speed_e: null,
  weight_power_ratio: null, weight_torque_ratio: null, specific_power: null,
  specific_torque: null,
  engine_code: null, unit_displacement: null, displacement: null, bore: null,
  stroke: null, cylinders: null, cylinders_arrangement: null,
  valves_per_cylinder: null, valve_control: null, valve_variation: null,
  tappets: null, aspiration: null, feeding: null, installation: null,
  arrangement: null, compression_ratio: null, drive_actuation: null,
  power_hp_g: null, power_hp_e: null, max_power_rpm: null,
  torque_g: null, torque_e: null, max_torque_rpm: null,
  coupling: null, gearbox: null, gearbox_code: null, gears: null, traction: null,
  height: null, width: null, length: null, wheelbase: null, front_track: null,
  rear_track: null, weight: null, payload: null, trunk_capacity: null,
  front_brakes: null, rear_brakes: null, sidewall_height: null,
  frontal_area: null, corrected_frontal_area: null, drag_coefficient: null,
  steering_assist: null, turning_diameter: null,
  front_suspension: null, rear_suspension: null, elastic_element: null,
  city_consumption_g: null, highway_consumption_g: null,
  city_range_g: null, highway_range_g: null,
  city_consumption_e: null, highway_consumption_e: null,
  city_range_e: null, highway_range_e: null,
  fuel_tank: null,
})

const typed = initNull()
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors. The worker file that imports `scrape` will error until Task 4 — that's expected.

- [ ] **Step 4: Commit**

```bash
git add backend/src/features/scrape-details/scraper/scraper.ts
git commit -m "refactor: expand scraper label map to cover all ~70 spec fields"
```

---

### Task 3: Database migration — expand `technical_specs` table

**Files:**
- Modify: `backend/prisma/schema.prisma` — Update `TechnicalSpecs` model
- Create: `backend/prisma/migrations/<timestamp>_expand_technical_specs/migration.sql`

**Interfaces:**
- Consumes: `FullSpecFields` column names from Task 1
- Produces: New DB schema with all ~70 columns

> **Important:** SQLite via Prisma does not support `ALTER TABLE DROP COLUMN` or `ALTER COLUMN`. The migration must drop and recreate the table or use a manual SQL approach. Since `technical_specs` is a looked-up table (not referenced by FKs from other tables), we can safely recreate it.

- [ ] **Step 1: Read current schema**

```bash
cat backend/prisma/schema.prisma
```

- [ ] **Step 2: Replace the `TechnicalSpecs` model**

Replace the existing `TechnicalSpecs` model in `schema.prisma`:

```prisma
model TechnicalSpecs {
  id                 Int         @id @default(autoincrement())
  vehicleYearId      Int         @unique @map("vehicle_year_id")
  sourceUrl          String      @map("source_url")
  scrapedAt          DateTime    @default(now()) @map("scraped_at")
  rawData            String?     @map("raw_data")

  // General
  year               String?
  fuel               String?
  configuration      String?
  warranty           String?
  generation         String?
  seats              String?
  platform           String?
  doors              String?
  size               String?
  origin             String?
  propulsion         String?
  series             String?

  // Performance
  acceleration_0_100 String?   @map("acceleration_0_100")
  topSpeedG          String?   @map("top_speed_g")
  topSpeedE          String?   @map("top_speed_e")
  weightPowerRatio   String?   @map("weight_power_ratio")
  weightTorqueRatio  String?   @map("weight_torque_ratio")
  specificPower      String?   @map("specific_power")
  specificTorque     String?   @map("specific_torque")

  // Engine
  engineCode         String?   @map("engine_code")
  unitDisplacement   String?   @map("unit_displacement")
  displacement       String?
  bore               String?
  stroke             String?
  cylinders          String?
  cylindersArrangement String? @map("cylinders_arrangement")
  valvesPerCylinder  String?   @map("valves_per_cylinder")
  valveControl       String?   @map("valve_control")
  valveVariation     String?   @map("valve_variation")
  tappets            String?
  aspiration         String?
  feeding            String?
  installation       String?
  arrangement        String?
  compressionRatio   String?   @map("compression_ratio")
  driveActuation     String?   @map("drive_actuation")
  powerHpG           String?   @map("power_hp_g")
  powerHpE           String?   @map("power_hp_e")
  maxPowerRpm        String?   @map("max_power_rpm")
  torqueG            String?   @map("torque_g")
  torqueE            String?   @map("torque_e")
  maxTorqueRpm       String?   @map("max_torque_rpm")

  // Transmission
  coupling           String?
  gearbox            String?
  gearboxCode        String?   @map("gearbox_code")
  gears              String?
  traction           String?

  // Dimensions
  height             String?
  width              String?
  length             String?
  wheelbase          String?
  frontTrack         String?   @map("front_track")
  rearTrack          String?   @map("rear_track")
  weight             String?
  payload            String?
  trunkCapacity      String?   @map("trunk_capacity")
  fuelTank           String?   @map("fuel_tank")

  // Brakes
  frontBrakes        String?   @map("front_brakes")
  rearBrakes         String?   @map("rear_brakes")
  sidewallHeight     String?   @map("sidewall_height")

  // Aerodynamics
  frontalArea        String?   @map("frontal_area")
  correctedFrontalArea String? @map("corrected_frontal_area")
  dragCoefficient    String?   @map("drag_coefficient")

  // Steering
  steeringAssist     String?   @map("steering_assist")
  turningDiameter    String?   @map("turning_diameter")

  // Suspension
  frontSuspension    String?   @map("front_suspension")
  rearSuspension     String?   @map("rear_suspension")
  elasticElement     String?   @map("elastic_element")

  // Consumption & Autonomy
  cityConsumptionG   String?   @map("city_consumption_g")
  highwayConsumptionG String?  @map("highway_consumption_g")
  cityRangeG         String?   @map("city_range_g")
  highwayRangeG      String?   @map("highway_range_g")
  cityConsumptionE   String?   @map("city_consumption_e")
  highwayConsumptionE String?  @map("highway_consumption_e")
  cityRangeE         String?   @map("city_range_e")
  highwayRangeE      String?   @map("highway_range_e")

  vehicleYear        VehicleYear @relation(fields: [vehicleYearId], references: [id], onDelete: Cascade)

  @@map("technical_specs")
}
```

- [ ] **Step 3: Generate the migration SQL**

SQLite requires a table recreate (no ALTER DROP COLUMN). Create the migration manually:

```bash
cd backend && npx prisma migrate dev --create-only --name expand_technical_specs
```

This generates a timestamped migration folder. Read the generated SQL, then replace it with the full recreate script below (adjust the timestamp in the path).

- [ ] **Step 4: Replace migration SQL with table recreate**

Replace the generated migration SQL with:

```sql
-- RedefineTables
CREATE TABLE "new_technical_specs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicle_year_id" INTEGER NOT NULL,
    "source_url" TEXT NOT NULL,
    "scraped_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_data" TEXT,
    "year" TEXT,
    "fuel" TEXT,
    "configuration" TEXT,
    "warranty" TEXT,
    "generation" TEXT,
    "seats" TEXT,
    "platform" TEXT,
    "doors" TEXT,
    "size" TEXT,
    "origin" TEXT,
    "propulsion" TEXT,
    "series" TEXT,
    "acceleration_0_100" TEXT,
    "top_speed_g" TEXT,
    "top_speed_e" TEXT,
    "weight_power_ratio" TEXT,
    "weight_torque_ratio" TEXT,
    "specific_power" TEXT,
    "specific_torque" TEXT,
    "engine_code" TEXT,
    "unit_displacement" TEXT,
    "displacement" TEXT,
    "bore" TEXT,
    "stroke" TEXT,
    "cylinders" TEXT,
    "cylinders_arrangement" TEXT,
    "valves_per_cylinder" TEXT,
    "valve_control" TEXT,
    "valve_variation" TEXT,
    "tappets" TEXT,
    "aspiration" TEXT,
    "feeding" TEXT,
    "installation" TEXT,
    "arrangement" TEXT,
    "compression_ratio" TEXT,
    "drive_actuation" TEXT,
    "power_hp_g" TEXT,
    "power_hp_e" TEXT,
    "max_power_rpm" TEXT,
    "torque_g" TEXT,
    "torque_e" TEXT,
    "max_torque_rpm" TEXT,
    "coupling" TEXT,
    "gearbox" TEXT,
    "gearbox_code" TEXT,
    "gears" TEXT,
    "traction" TEXT,
    "height" TEXT,
    "width" TEXT,
    "length" TEXT,
    "wheelbase" TEXT,
    "front_track" TEXT,
    "rear_track" TEXT,
    "weight" TEXT,
    "payload" TEXT,
    "trunk_capacity" TEXT,
    "fuel_tank" TEXT,
    "front_brakes" TEXT,
    "rear_brakes" TEXT,
    "sidewall_height" TEXT,
    "frontal_area" TEXT,
    "corrected_frontal_area" TEXT,
    "drag_coefficient" TEXT,
    "steering_assist" TEXT,
    "turning_diameter" TEXT,
    "front_suspension" TEXT,
    "rear_suspension" TEXT,
    "elastic_element" TEXT,
    "city_consumption_g" TEXT,
    "highway_consumption_g" TEXT,
    "city_range_g" TEXT,
    "highway_range_g" TEXT,
    "city_consumption_e" TEXT,
    "highway_consumption_e" TEXT,
    "city_range_e" TEXT,
    "highway_range_e" TEXT,
    CONSTRAINT "technical_specs_vehicle_year_id_fkey" FOREIGN KEY ("vehicle_year_id") REFERENCES "vehicle_years" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing data (only columns that exist in old table)
INSERT INTO "new_technical_specs" (
    "id", "vehicle_year_id", "source_url", "scraped_at", "raw_data",
    "engine_code", "power_hp_g", "torque_g", "gearbox", "fuel",
    "city_consumption_g", "highway_consumption_g"
)
SELECT
    "id", "vehicle_year_id", "source_url", "scraped_at", "raw_data",
    "engine", "power_hp", "torque", "transmission", "fuel_type",
    "consumption_city", "consumption_highway"
FROM "technical_specs";

-- Swap tables
DROP TABLE "technical_specs";
ALTER TABLE "new_technical_specs" RENAME TO "technical_specs";

-- Recreate unique index
CREATE UNIQUE INDEX "technical_specs_vehicle_year_id_key" ON "technical_specs"("vehicle_year_id");
```

- [ ] **Step 5: Apply the migration**

```bash
cd backend && npx prisma migrate dev
```
Expected: migration applied successfully.

- [ ] **Step 6: Regenerate Prisma client**

```bash
cd backend && npx prisma generate
```
Expected: no errors.

- [ ] **Step 7: Verify schema compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: errors in worker.ts and scrapeDetails.repository.ts (old column names) — these will be fixed in Tasks 4 and 5.

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: expand technical_specs table to ~70 columns with G/E fuel variants"
```

---

### Task 4: Update `ScrapeDetailsRepository.saveSpecsAndMarkDone`

**Files:**
- Modify: `backend/src/features/scrape-details/scrapeDetails.repository.ts`

**Interfaces:**
- Consumes: `FullSpecFields` from Task 1, new DB schema from Task 3
- Produces: `saveSpecsAndMarkDone` accepting all new fields

- [ ] **Step 1: Read the current repository file**

```bash
cat backend/src/features/scrape-details/scrapeDetails.repository.ts
```

- [ ] **Step 2: Replace `saveSpecsAndMarkDone` method signature and body**

Replace the method (currently accepting 9 individual typed field params) with one that accepts a `FullSpecFields` object:

```ts
/** Upsert technical specs for a vehicle year and mark job done, in a single transaction. */
async saveSpecsAndMarkDone(
  jobId: string,
  vehicleYearId: number,
  sourceUrl: string,
  rawData: string,
  attempts: number,
  fields: FullSpecFields,
): Promise<void> {
  await this.db.$transaction([
    this.db.technicalSpecs.upsert({
      where: { vehicleYearId },
      create: {
        vehicleYearId,
        sourceUrl,
        rawData,
        scrapedAt: new Date(),
        year: fields.year,
        fuel: fields.fuel,
        configuration: fields.configuration,
        warranty: fields.warranty,
        generation: fields.generation,
        seats: fields.seats,
        platform: fields.platform,
        doors: fields.doors,
        size: fields.size,
        origin: fields.origin,
        propulsion: fields.propulsion,
        series: fields.series,
        acceleration_0_100: fields.acceleration_0_100,
        topSpeedG: fields.top_speed_g,
        topSpeedE: fields.top_speed_e,
        weightPowerRatio: fields.weight_power_ratio,
        weightTorqueRatio: fields.weight_torque_ratio,
        specificPower: fields.specific_power,
        specificTorque: fields.specific_torque,
        engineCode: fields.engine_code,
        unitDisplacement: fields.unit_displacement,
        displacement: fields.displacement,
        bore: fields.bore,
        stroke: fields.stroke,
        cylinders: fields.cylinders,
        cylindersArrangement: fields.cylinders_arrangement,
        valvesPerCylinder: fields.valves_per_cylinder,
        valveControl: fields.valve_control,
        valveVariation: fields.valve_variation,
        tappets: fields.tappets,
        aspiration: fields.aspiration,
        feeding: fields.feeding,
        installation: fields.installation,
        arrangement: fields.arrangement,
        compressionRatio: fields.compression_ratio,
        driveActuation: fields.drive_actuation,
        powerHpG: fields.power_hp_g,
        powerHpE: fields.power_hp_e,
        maxPowerRpm: fields.max_power_rpm,
        torqueG: fields.torque_g,
        torqueE: fields.torque_e,
        maxTorqueRpm: fields.max_torque_rpm,
        coupling: fields.coupling,
        gearbox: fields.gearbox,
        gearboxCode: fields.gearbox_code,
        gears: fields.gears,
        traction: fields.traction,
        height: fields.height,
        width: fields.width,
        length: fields.length,
        wheelbase: fields.wheelbase,
        frontTrack: fields.front_track,
        rearTrack: fields.rear_track,
        weight: fields.weight,
        payload: fields.payload,
        trunkCapacity: fields.trunk_capacity,
        fuelTank: fields.fuel_tank,
        frontBrakes: fields.front_brakes,
        rearBrakes: fields.rear_brakes,
        sidewallHeight: fields.sidewall_height,
        frontalArea: fields.frontal_area,
        correctedFrontalArea: fields.corrected_frontal_area,
        dragCoefficient: fields.drag_coefficient,
        steeringAssist: fields.steering_assist,
        turningDiameter: fields.turning_diameter,
        frontSuspension: fields.front_suspension,
        rearSuspension: fields.rear_suspension,
        elasticElement: fields.elastic_element,
        cityConsumptionG: fields.city_consumption_g,
        highwayConsumptionG: fields.highway_consumption_g,
        cityRangeG: fields.city_range_g,
        highwayRangeG: fields.highway_range_g,
        cityConsumptionE: fields.city_consumption_e,
        highwayConsumptionE: fields.highway_consumption_e,
        cityRangeE: fields.city_range_e,
        highwayRangeE: fields.highway_range_e,
      },
      update: {
        sourceUrl,
        rawData,
        scrapedAt: new Date(),
        year: fields.year,
        fuel: fields.fuel,
        configuration: fields.configuration,
        warranty: fields.warranty,
        generation: fields.generation,
        seats: fields.seats,
        platform: fields.platform,
        doors: fields.doors,
        size: fields.size,
        origin: fields.origin,
        propulsion: fields.propulsion,
        series: fields.series,
        acceleration_0_100: fields.acceleration_0_100,
        topSpeedG: fields.top_speed_g,
        topSpeedE: fields.top_speed_e,
        weightPowerRatio: fields.weight_power_ratio,
        weightTorqueRatio: fields.weight_torque_ratio,
        specificPower: fields.specific_power,
        specificTorque: fields.specific_torque,
        engineCode: fields.engine_code,
        unitDisplacement: fields.unit_displacement,
        displacement: fields.displacement,
        bore: fields.bore,
        stroke: fields.stroke,
        cylinders: fields.cylinders,
        cylindersArrangement: fields.cylinders_arrangement,
        valvesPerCylinder: fields.valves_per_cylinder,
        valveControl: fields.valve_control,
        valveVariation: fields.valve_variation,
        tappets: fields.tappets,
        aspiration: fields.aspiration,
        feeding: fields.feeding,
        installation: fields.installation,
        arrangement: fields.arrangement,
        compressionRatio: fields.compression_ratio,
        driveActuation: fields.drive_actuation,
        powerHpG: fields.power_hp_g,
        powerHpE: fields.power_hp_e,
        maxPowerRpm: fields.max_power_rpm,
        torqueG: fields.torque_g,
        torqueE: fields.torque_e,
        maxTorqueRpm: fields.max_torque_rpm,
        coupling: fields.coupling,
        gearbox: fields.gearbox,
        gearboxCode: fields.gearbox_code,
        gears: fields.gears,
        traction: fields.traction,
        height: fields.height,
        width: fields.width,
        length: fields.length,
        wheelbase: fields.wheelbase,
        frontTrack: fields.front_track,
        rearTrack: fields.rear_track,
        weight: fields.weight,
        payload: fields.payload,
        trunkCapacity: fields.trunk_capacity,
        fuelTank: fields.fuel_tank,
        frontBrakes: fields.front_brakes,
        rearBrakes: fields.rear_brakes,
        sidewallHeight: fields.sidewall_height,
        frontalArea: fields.frontal_area,
        correctedFrontalArea: fields.corrected_frontal_area,
        dragCoefficient: fields.drag_coefficient,
        steeringAssist: fields.steering_assist,
        turningDiameter: fields.turning_diameter,
        frontSuspension: fields.front_suspension,
        rearSuspension: fields.rear_suspension,
        elasticElement: fields.elastic_element,
        cityConsumptionG: fields.city_consumption_g,
        highwayConsumptionG: fields.highway_consumption_g,
        cityRangeG: fields.city_range_g,
        highwayRangeG: fields.highway_range_g,
        cityConsumptionE: fields.city_consumption_e,
        highwayConsumptionE: fields.highway_consumption_e,
        cityRangeE: fields.city_range_e,
        highwayRangeE: fields.highway_range_e,
      },
    }),
    this.db.job.update({
      where: { jobId },
      data: { status: 'done', updatedAt: new Date(), attempts },
    }),
  ])
}
```

Add the import at the top of the file:

```ts
import type { FullSpecFields } from './scraper/scraper.types'
```

Remove the old Prisma `technicalSpecs` column references (`engine`, `powerHp`, `torque`, `transmission`, `fuelType`, `consumptionCity`, `consumptionHighway`) that no longer exist in the updated schema.

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd backend && npx tsc --noEmit
```
Expected: errors only in worker.ts (will be fixed in next task). The repository should compile clean.

- [ ] **Step 4: Commit**

```bash
git add backend/src/features/scrape-details/scrapeDetails.repository.ts
git commit -m "refactor: update saveSpecsAndMarkDone for expanded spec columns"
```

---

### Task 5: Update worker to pass all fields

**Files:**
- Modify: `backend/src/features/scrape-details/worker/worker.ts`

**Interfaces:**
- Consumes: updated `scrape()` return type from Task 2, updated `saveSpecsAndMarkDone()` from Task 4

- [ ] **Step 1: Read the current worker file**

```bash
cat backend/src/features/scrape-details/worker/worker.ts
```

- [ ] **Step 2: Replace the worker's job processing logic**

Replace the block from `const specs = await scrape(url)` through the `saveSpecsAndMarkDone` call (lines 47-85) with:

```ts
const specs = await scrape(url)

// Count non-null fields (excluding rawData)
const fieldsForCount = { ...specs } as Record<string, unknown>
delete fieldsForCount.rawData
const fieldsFilled = Object.values(fieldsForCount).filter((v) => v !== null).length

console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'scraping_completed',
    jobId,
    fieldsFilled,
  }),
)

// Step 3 — Persist in a single transaction
await repository.saveSpecsAndMarkDone(
  jobId,
  vehicleYearId,
  url,
  specs.rawData,
  job.attemptsMade + 1,
  specs, // FullSpecFields — all known columns passed through
)

console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'transaction_committed',
    jobId,
  }),
)
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/features/scrape-details/worker/worker.ts
git commit -m "refactor: pass full spec fields from scraper through worker to repository"
```

---

### Task 6: Create `VehicleDetailRepository`

**Files:**
- Create: `backend/src/features/vehicle-detail/vehicleDetail.repository.ts`
- Create: `backend/src/features/vehicle-detail/index.ts`

**Interfaces:**
- Consumes: PrismaClient, DB schema from Task 3
- Produces: `VehicleDetailRepository` class with `findVehicleWithSpecs(fipeCode: string, yearCode: string)` method and `SpecsRow` type

- [ ] **Step 1: Create the repository file**

```ts
import type { PrismaClient } from '@prisma/client'

/** Flat technical specs as returned from the DB (Prisma camelCase). */
export interface SpecsRow {
  sourceUrl: string
  scrapedAt: Date
  year: string | null
  fuel: string | null
  configuration: string | null
  warranty: string | null
  generation: string | null
  seats: string | null
  platform: string | null
  doors: string | null
  size: string | null
  origin: string | null
  propulsion: string | null
  series: string | null
  acceleration_0_100: string | null
  topSpeedG: string | null
  topSpeedE: string | null
  weightPowerRatio: string | null
  weightTorqueRatio: string | null
  specificPower: string | null
  specificTorque: string | null
  engineCode: string | null
  unitDisplacement: string | null
  displacement: string | null
  bore: string | null
  stroke: string | null
  cylinders: string | null
  cylindersArrangement: string | null
  valvesPerCylinder: string | null
  valveControl: string | null
  valveVariation: string | null
  tappets: string | null
  aspiration: string | null
  feeding: string | null
  installation: string | null
  arrangement: string | null
  compressionRatio: string | null
  driveActuation: string | null
  powerHpG: string | null
  powerHpE: string | null
  maxPowerRpm: string | null
  torqueG: string | null
  torqueE: string | null
  maxTorqueRpm: string | null
  coupling: string | null
  gearbox: string | null
  gearboxCode: string | null
  gears: string | null
  traction: string | null
  height: string | null
  width: string | null
  length: string | null
  wheelbase: string | null
  frontTrack: string | null
  rearTrack: string | null
  weight: string | null
  payload: string | null
  trunkCapacity: string | null
  fuelTank: string | null
  frontBrakes: string | null
  rearBrakes: string | null
  sidewallHeight: string | null
  frontalArea: string | null
  correctedFrontalArea: string | null
  dragCoefficient: string | null
  steeringAssist: string | null
  turningDiameter: string | null
  frontSuspension: string | null
  rearSuspension: string | null
  elasticElement: string | null
  cityConsumptionG: string | null
  highwayConsumptionG: string | null
  cityRangeG: string | null
  highwayRangeG: string | null
  cityConsumptionE: string | null
  highwayConsumptionE: string | null
  cityRangeE: string | null
  highwayRangeE: string | null
}

/** Return type from findVehicleWithSpecs — vehicle info plus optional specs. */
export interface VehicleWithSpecs {
  fipeCode: string
  vehicleType: string
  yearCode: string
  brand: string | null
  model: string | null
  year: string
  fuel: string | null
  price: string | null
  specs: SpecsRow | null
}

export class VehicleDetailRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Find a vehicle by FIPE code, a specific year, and optionally its technical specs. */
  async findVehicleWithSpecs(
    fipeCode: string,
    yearCode: string,
  ): Promise<VehicleWithSpecs | null> {
    const vehicle = await this.db.vehicle.findUnique({
      where: { fipeCode },
      include: {
        years: {
          where: { yearCode },
          include: {
            technicalSpecs: true,
          },
        },
      },
    })

    if (!vehicle) return null

    const yearRow = vehicle.years[0]
    if (!yearRow) return null

    const specs = yearRow.technicalSpecs ?? null

    return {
      fipeCode: vehicle.fipeCode,
      vehicleType: vehicle.vehicleType,
      yearCode: yearRow.yearCode,
      brand: vehicle.brand,
      model: vehicle.model,
      year: yearRow.yearLabel,
      fuel: yearRow.fuel,
      price: yearRow.price,
      specs: specs ? this.toSpecsRow(specs) : null,
    }
  }

  /** Map Prisma TechnicalSpecs to flat SpecsRow with snake_case keys. */
  private toSpecsRow(s: NonNullable<Awaited<ReturnType<typeof this.findVehicleWithSpecs>>['specs']>): SpecsRow {
    return {
      sourceUrl: s.sourceUrl,
      scrapedAt: s.scrapedAt,
      year: s.year,
      fuel: s.fuel,
      configuration: s.configuration,
      warranty: s.warranty,
      generation: s.generation,
      seats: s.seats,
      platform: s.platform,
      doors: s.doors,
      size: s.size,
      origin: s.origin,
      propulsion: s.propulsion,
      series: s.series,
      acceleration_0_100: s.acceleration_0_100,
      topSpeedG: s.topSpeedG,
      topSpeedE: s.topSpeedE,
      weightPowerRatio: s.weightPowerRatio,
      weightTorqueRatio: s.weightTorqueRatio,
      specificPower: s.specificPower,
      specificTorque: s.specificTorque,
      engineCode: s.engineCode,
      unitDisplacement: s.unitDisplacement,
      displacement: s.displacement,
      bore: s.bore,
      stroke: s.stroke,
      cylinders: s.cylinders,
      cylindersArrangement: s.cylindersArrangement,
      valvesPerCylinder: s.valvesPerCylinder,
      valveControl: s.valveControl,
      valveVariation: s.valveVariation,
      tappets: s.tappets,
      aspiration: s.aspiration,
      feeding: s.feeding,
      installation: s.installation,
      arrangement: s.arrangement,
      compressionRatio: s.compressionRatio,
      driveActuation: s.driveActuation,
      powerHpG: s.powerHpG,
      powerHpE: s.powerHpE,
      maxPowerRpm: s.maxPowerRpm,
      torqueG: s.torqueG,
      torqueE: s.torqueE,
      maxTorqueRpm: s.maxTorqueRpm,
      coupling: s.coupling,
      gearbox: s.gearbox,
      gearboxCode: s.gearboxCode,
      gears: s.gears,
      traction: s.traction,
      height: s.height,
      width: s.width,
      length: s.length,
      wheelbase: s.wheelbase,
      frontTrack: s.frontTrack,
      rearTrack: s.rearTrack,
      weight: s.weight,
      payload: s.payload,
      trunkCapacity: s.trunkCapacity,
      fuelTank: s.fuelTank,
      frontBrakes: s.frontBrakes,
      rearBrakes: s.rearBrakes,
      sidewallHeight: s.sidewallHeight,
      frontalArea: s.frontalArea,
      correctedFrontalArea: s.correctedFrontalArea,
      dragCoefficient: s.dragCoefficient,
      steeringAssist: s.steeringAssist,
      turningDiameter: s.turningDiameter,
      frontSuspension: s.frontSuspension,
      rearSuspension: s.rearSuspension,
      elasticElement: s.elasticElement,
      cityConsumptionG: s.cityConsumptionG,
      highwayConsumptionG: s.highwayConsumptionG,
      cityRangeG: s.cityRangeG,
      highwayRangeG: s.highwayRangeG,
      cityConsumptionE: s.cityConsumptionE,
      highwayConsumptionE: s.highwayConsumptionE,
      cityRangeE: s.cityRangeE,
      highwayRangeE: s.highwayRangeE,
    }
  }
}
```

- [ ] **Step 2: Create index.ts**

```ts
export { VehicleDetailRepository } from './vehicleDetail.repository'
export type { VehicleWithSpecs, SpecsRow } from './vehicleDetail.repository'
export { createVehicleDetailRoutes } from './vehicleDetail.routes'
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors (route file not created yet — it's ok if only the route import errors).

- [ ] **Step 4: Commit**

```bash
git add backend/src/features/vehicle-detail/
git commit -m "feat: add VehicleDetailRepository for specs lookup by fipeCode/yearCode"
```

---

### Task 7: Create `VehicleDetailRoutes`

**Files:**
- Create: `backend/src/features/vehicle-detail/vehicleDetail.routes.ts`

**Interfaces:**
- Consumes: `VehicleDetailRepository` from Task 6
- Produces: Express Router with `GET /api/vehicles/:fipeCode/:yearCode/specs`

- [ ] **Step 1: Create the routes file**

```ts
import { Router } from 'express'
import type { VehicleDetailRepository } from './vehicleDetail.repository'
import { asyncHandler } from '../../shared/utils/asyncHandler'
import { NotFoundError } from '../../shared/errors/NotFoundError'
import type { VehicleWithSpecs } from './vehicleDetail.repository'

function toApiResponse(vehicle: VehicleWithSpecs): Record<string, unknown> {
  if (!vehicle.specs) {
    return {
      fipeCode: vehicle.fipeCode,
      vehicleType: vehicle.vehicleType,
      yearCode: vehicle.yearCode,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      fuel: vehicle.fuel,
      price: vehicle.price,
      specs: null,
    }
  }

  const s = vehicle.specs
  return {
    fipeCode: vehicle.fipeCode,
    vehicleType: vehicle.vehicleType,
    yearCode: vehicle.yearCode,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    fuel: vehicle.fuel,
    price: vehicle.price,
    specs: {
      sourceUrl: s.sourceUrl,
      scrapedAt: s.scrapedAt,
      year: s.year,
      fuel: s.fuel,
      configuration: s.configuration,
      warranty: s.warranty,
      generation: s.generation,
      seats: s.seats,
      platform: s.platform,
      doors: s.doors,
      size: s.size,
      origin: s.origin,
      propulsion: s.propulsion,
      series: s.series,
      acceleration_0_100: s.acceleration_0_100,
      top_speed_g: s.topSpeedG,
      top_speed_e: s.topSpeedE,
      weight_power_ratio: s.weightPowerRatio,
      weight_torque_ratio: s.weightTorqueRatio,
      specific_power: s.specificPower,
      specific_torque: s.specificTorque,
      engine_code: s.engineCode,
      unit_displacement: s.unitDisplacement,
      displacement: s.displacement,
      bore: s.bore,
      stroke: s.stroke,
      cylinders: s.cylinders,
      cylinders_arrangement: s.cylindersArrangement,
      valves_per_cylinder: s.valvesPerCylinder,
      valve_control: s.valveControl,
      valve_variation: s.valveVariation,
      tappets: s.tappets,
      aspiration: s.aspiration,
      feeding: s.feeding,
      installation: s.installation,
      arrangement: s.arrangement,
      compression_ratio: s.compressionRatio,
      drive_actuation: s.driveActuation,
      power_hp_g: s.powerHpG,
      power_hp_e: s.powerHpE,
      max_power_rpm: s.maxPowerRpm,
      torque_g: s.torqueG,
      torque_e: s.torqueE,
      max_torque_rpm: s.maxTorqueRpm,
      coupling: s.coupling,
      gearbox: s.gearbox,
      gearbox_code: s.gearboxCode,
      gears: s.gears,
      traction: s.traction,
      height: s.height,
      width: s.width,
      length: s.length,
      wheelbase: s.wheelbase,
      front_track: s.frontTrack,
      rear_track: s.rearTrack,
      weight: s.weight,
      payload: s.payload,
      trunk_capacity: s.trunkCapacity,
      fuel_tank: s.fuelTank,
      front_brakes: s.frontBrakes,
      rear_brakes: s.rearBrakes,
      sidewall_height: s.sidewallHeight,
      frontal_area: s.frontalArea,
      corrected_frontal_area: s.correctedFrontalArea,
      drag_coefficient: s.dragCoefficient,
      steering_assist: s.steeringAssist,
      turning_diameter: s.turningDiameter,
      front_suspension: s.frontSuspension,
      rear_suspension: s.rearSuspension,
      elastic_element: s.elasticElement,
      city_consumption_g: s.cityConsumptionG,
      highway_consumption_g: s.highwayConsumptionG,
      city_range_g: s.cityRangeG,
      highway_range_g: s.highwayRangeG,
      city_consumption_e: s.cityConsumptionE,
      highway_consumption_e: s.highwayConsumptionE,
      city_range_e: s.cityRangeE,
      highway_range_e: s.highwayRangeE,
    },
  }
}

export function createVehicleDetailRoutes(
  repository: VehicleDetailRepository,
): Router {
  const router = Router()

  // GET /api/vehicles/:fipeCode/:yearCode/specs
  router.get(
    '/api/vehicles/:fipeCode/:yearCode/specs',
    asyncHandler(async (req, res) => {
      const fipeCode = req.params.fipeCode as string
      const yearCode = req.params.yearCode as string

      const vehicle = await repository.findVehicleWithSpecs(fipeCode, yearCode)
      if (!vehicle) {
        throw new NotFoundError(
          'VEHICLE_NOT_FOUND',
          `No vehicle found with FIPE code ${fipeCode}`,
        )
      }

      res.json({
        success: true,
        data: toApiResponse(vehicle),
      })
    }),
  )

  return router
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/features/vehicle-detail/vehicleDetail.routes.ts
git commit -m "feat: add GET /api/vehicles/:fipeCode/:yearCode/specs endpoint"
```

---

### Task 8: Integration tests for vehicle-detail endpoint

**Files:**
- Create: `backend/src/features/vehicle-detail/vehicleDetail.test.ts`

**Interfaces:**
- Consumes: Route from Task 7, Repository from Task 6
- Tests: 200 with specs, 200 without specs, 404 for unknown vehicle

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { VehicleDetailRepository } from './vehicleDetail.repository'
import { createVehicleDetailRoutes } from './vehicleDetail.routes'
import { errorHandler } from '../../shared/middleware/errorHandler'
import { createTestDb, clearTestDb, closeTestDb } from '../../db/test-helpers'

describe('Vehicle Detail Routes', () => {
  let db: PrismaClient
  let repo: VehicleDetailRepository
  let app: express.Express

  beforeAll(() => {
    db = createTestDb()
  })

  beforeEach(async () => {
    repo = new VehicleDetailRepository(db)
    app = express()
    app.use(express.json())
    app.use(createVehicleDetailRoutes(repo))
    app.use(errorHandler)
    await clearTestDb(db)
  })

  afterAll(async () => {
    await closeTestDb(db)
  })

  async function seedVehicleWithYearAndSpecs(): Promise<{ fipeCode: string; yearCode: string }> {
    const vehicle = await db.vehicle.create({
      data: {
        fipeCode: '005490-9',
        vehicleType: 'cars',
        brand: 'Audi',
        model: 'RS6 Avant',
        years: {
          create: {
            yearCode: '2004-1',
            yearLabel: '2004',
            price: 'R$ 85.000',
            fuel: 'Gasolina',
          },
        },
      },
      include: { years: true },
    })

    const yearId = vehicle.years[0].id

    await db.technicalSpecs.create({
      data: {
        vehicleYearId: yearId,
        sourceUrl: 'https://example.com/car',
        powerHpG: '450 cv',
        torqueG: '57,1 kgfm',
        gearbox: 'Automático',
        fuel: 'Gasolina',
        displacement: '4172 cm³',
        engineCode: 'EA824',
      },
    })

    return { fipeCode: vehicle.fipeCode, yearCode: '2004-1' }
  }

  async function seedVehicleWithYearNoSpecs(): Promise<{ fipeCode: string; yearCode: string }> {
    const vehicle = await db.vehicle.create({
      data: {
        fipeCode: '001002-5',
        vehicleType: 'cars',
        brand: 'VW',
        model: 'Gol',
        years: {
          create: {
            yearCode: '2020-1',
            yearLabel: '2020',
            price: 'R$ 45.000',
            fuel: 'Flex',
          },
        },
      },
    })

    return { fipeCode: vehicle.fipeCode, yearCode: '2020-1' }
  }

  describe('GET /api/vehicles/:fipeCode/:yearCode/specs', () => {
    it('should return 200 with specs when vehicle and specs exist', async () => {
      const { fipeCode, yearCode } = await seedVehicleWithYearAndSpecs()

      const response = await request(app).get(`/api/vehicles/${fipeCode}/${yearCode}/specs`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.fipeCode).toBe(fipeCode)
      expect(response.body.data.brand).toBe('Audi')
      expect(response.body.data.specs).not.toBeNull()
      expect(response.body.data.specs.power_hp_g).toBe('450 cv')
      expect(response.body.data.specs.gearbox).toBe('Automático')
    })

    it('should return 200 with specs: null when vehicle exists but has no specs', async () => {
      const { fipeCode, yearCode } = await seedVehicleWithYearNoSpecs()

      const response = await request(app).get(`/api/vehicles/${fipeCode}/${yearCode}/specs`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.specs).toBeNull()
    })

    it('should return 404 when fipeCode does not exist', async () => {
      const response = await request(app).get('/api/vehicles/999999-9/2020-1/specs')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })

    it('should return 200 with specs: null when yearCode does not match', async () => {
      const { fipeCode } = await seedVehicleWithYearNoSpecs()

      const response = await request(app).get(`/api/vehicles/${fipeCode}/2099-1/specs`)

      // Vehicle exists but year doesn't — vehicle.years.where filters out,
      // so vehicle.years[0] is undefined → returns null from repository
      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND')
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
cd backend && npx vitest run src/features/vehicle-detail/vehicleDetail.test.ts
```
Expected: all 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/features/vehicle-detail/vehicleDetail.test.ts
git commit -m "test: add integration tests for vehicle-detail specs endpoint"
```

---

### Task 9: Register vehicle-detail routes in server.ts

**Files:**
- Modify: `backend/src/server.ts`

**Interfaces:**
- Consumes: `VehicleDetailRepository` and `createVehicleDetailRoutes` from Tasks 6/7
- Produces: Mounted route at `/api/vehicles`

- [ ] **Step 1: Read server.ts**

```bash
cat backend/src/server.ts
```

- [ ] **Step 2: Add imports**

After the existing scrape-details imports, add:

```ts
import { VehicleDetailRepository } from './features/vehicle-detail/index'
import { createVehicleDetailRoutes } from './features/vehicle-detail/index'
```

- [ ] **Step 3: Wire dependency and mount route**

After the existing `scrapeDetailsService` line and before the health check route, add:

```ts
const vehicleDetailRepo = new VehicleDetailRepository(db)
```

After the existing `app.use(createScrapeDetailsRoutes(...))` line, add:

```ts
app.use(createVehicleDetailRoutes(vehicleDetailRepo))
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Run the vehicle-detail tests to verify route is wired**

```bash
cd backend && npx vitest run src/features/vehicle-detail/vehicleDetail.test.ts
```
Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: mount vehicle-detail routes in server"
```

---

### Task 10: Backend — verify existing scrape-details tests still pass

**Files:**
- Test: `backend/src/features/scrape-details/scrapeDetails.test.ts`

- [ ] **Step 1: Read the existing test file**

```bash
cat backend/src/features/scrape-details/scrapeDetails.test.ts
```

The existing test calls `saveSpecsAndMarkDone` and tests the scraping flow. Since the repository method signature changed, check whether any test code directly calls the old signature. If tests reference old column names, update them.

- [ ] **Step 2: Run the full test suite**

```bash
cd backend && npx vitest run
```
Expected: all tests PASS (scrape-details, favorite-vehicle, vehicle-detail, vehicle-search).

- [ ] **Step 3: Commit any test fixes**

```bash
git add backend/src/features/scrape-details/scrapeDetails.test.ts
git commit -m "test: fix scrape-details tests for updated repository interface"
```

---

### Task 11: Frontend — vehicle detail API service

**Files:**
- Create: `frontend/src/services/vehicleDetailApi.ts`

**Interfaces:**
- Produces: `getVehicleSpecs(fipeCode: string, yearCode: string): Promise<VehicleSpecsResponse>`

- [ ] **Step 1: Read types.ts for existing type patterns**

```bash
cat frontend/src/services/types.ts
```

- [ ] **Step 2: Create the API service file**

```ts
import { api } from './api'

/** Matches the backend's SpecsRow, keeping snake_case from the JSON response. */
export interface SpecsData {
  sourceUrl: string
  scrapedAt: string
  year: string | null
  fuel: string | null
  configuration: string | null
  warranty: string | null
  generation: string | null
  seats: string | null
  platform: string | null
  doors: string | null
  size: string | null
  origin: string | null
  propulsion: string | null
  series: string | null
  acceleration_0_100: string | null
  top_speed_g: string | null
  top_speed_e: string | null
  weight_power_ratio: string | null
  weight_torque_ratio: string | null
  specific_power: string | null
  specific_torque: string | null
  engine_code: string | null
  unit_displacement: string | null
  displacement: string | null
  bore: string | null
  stroke: string | null
  cylinders: string | null
  cylinders_arrangement: string | null
  valves_per_cylinder: string | null
  valve_control: string | null
  valve_variation: string | null
  tappets: string | null
  aspiration: string | null
  feeding: string | null
  installation: string | null
  arrangement: string | null
  compression_ratio: string | null
  drive_actuation: string | null
  power_hp_g: string | null
  power_hp_e: string | null
  max_power_rpm: string | null
  torque_g: string | null
  torque_e: string | null
  max_torque_rpm: string | null
  coupling: string | null
  gearbox: string | null
  gearbox_code: string | null
  gears: string | null
  traction: string | null
  height: string | null
  width: string | null
  length: string | null
  wheelbase: string | null
  front_track: string | null
  rear_track: string | null
  weight: string | null
  payload: string | null
  trunk_capacity: string | null
  fuel_tank: string | null
  front_brakes: string | null
  rear_brakes: string | null
  sidewall_height: string | null
  frontal_area: string | null
  corrected_frontal_area: string | null
  drag_coefficient: string | null
  steering_assist: string | null
  turning_diameter: string | null
  front_suspension: string | null
  rear_suspension: string | null
  elastic_element: string | null
  city_consumption_g: string | null
  highway_consumption_g: string | null
  city_range_g: string | null
  highway_range_g: string | null
  city_consumption_e: string | null
  highway_consumption_e: string | null
  city_range_e: string | null
  highway_range_e: string | null
}

export interface VehicleSpecsResponse {
  fipeCode: string
  vehicleType: string
  yearCode: string
  brand: string | null
  model: string | null
  year: string
  fuel: string | null
  price: string | null
  specs: SpecsData | null
}

export async function getVehicleSpecs(
  fipeCode: string,
  yearCode: string,
): Promise<VehicleSpecsResponse> {
  const response = await api.get(`/api/vehicles/${fipeCode}/${yearCode}/specs`)
  return response.data.data
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/vehicleDetailApi.ts
git commit -m "feat: add vehicle detail API service with SpecsData types"
```

---

### Task 12: Frontend — React Query hook for vehicle specs

**Files:**
- Create: `frontend/src/hooks/useVehicleSpecs.ts`

**Interfaces:**
- Consumes: `getVehicleSpecs` from Task 11
- Produces: `useVehicleSpecs(fipeCode, yearCode)` hook

- [ ] **Step 1: Create the hook file**

```ts
import { useQuery } from '@tanstack/react-query'
import { getVehicleSpecs } from '../services/vehicleDetailApi'
import type { VehicleSpecsResponse } from '../services/vehicleDetailApi'

export function useVehicleSpecs(
  fipeCode: string,
  yearCode: string,
): {
  data: VehicleSpecsResponse | undefined
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicle-specs', fipeCode, yearCode],
    queryFn: () => getVehicleSpecs(fipeCode, yearCode),
    enabled: !!fipeCode && !!yearCode,
  })

  return {
    data,
    isLoading,
    error: error as Error | null,
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useVehicleSpecs.ts
git commit -m "feat: add useVehicleSpecs hook with React Query"
```

---

### Task 13: Frontend — Add "Ver Detalhes" link to VehicleCard

**Files:**
- Modify: `frontend/src/features/favorite-vehicle/VehicleCard.tsx`

**Interfaces:**
- Consumes: react-router-dom `Link`, `fipeCode` from props
- Produces: "Ver Detalhes" link on every year row

- [ ] **Step 1: Read the current VehicleCard**

```bash
cat frontend/src/features/favorite-vehicle/VehicleCard.tsx
```

- [ ] **Step 2: Add the import and modify the year row**

Add the import at the top:

```ts
import { Link } from 'react-router-dom'
```

In each year row's `<div>` (the one with className `"flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5"`), add the link after the price span:

```tsx
{year.price && (
  <span className="text-sm font-semibold">
    {formatPrice(parsePrice(year.price))}
  </span>
)}
<Link
  to={`/vehicle/${fipeCode}/${year.yearCode}`}
  className="ml-2 shrink-0 text-xs text-primary hover:underline"
>
  Ver Detalhes →
</Link>
```

The full year row block becomes:

```tsx
<div
  key={year.yearCode}
  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5"
>
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium">{year.yearLabel}</span>
    {year.fuel && (
      <Badge variant="secondary" className="text-xs">
        {year.fuel}
      </Badge>
    )}
  </div>
  <div className="flex items-center gap-2">
    {year.price && (
      <span className="text-sm font-semibold">
        {formatPrice(parsePrice(year.price))}
      </span>
    )}
    <Link
      to={`/vehicle/${fipeCode}/${year.yearCode}`}
      className="shrink-0 text-xs text-primary hover:underline"
    >
      Ver Detalhes →
    </Link>
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/favorite-vehicle/VehicleCard.tsx
git commit -m "feat: add Ver Detalhes link to each year row in VehicleCard"
```

---

### Task 14: Frontend — spec-sections config

**Files:**
- Create: `frontend/src/features/vehicle-detail/spec-sections.ts`

**Interfaces:**
- Consumes: `SpecsData` from Task 11
- Produces: `SPEC_SECTIONS` array, `SpecSectionDefinition` interface, `SpecItem` interface

- [ ] **Step 1: Create the config file**

```ts
import {
  Zap, Engine, Cog, Ruler, Fuel, Disc, Car,
  Wind, SteeringWheel, Info,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SpecsData } from '../../services/vehicleDetailApi'

export interface SpecFieldDef {
  column: keyof SpecsData
  label: string
}

export interface SpecSectionDefinition {
  heading: string
  icon: LucideIcon
  fields: SpecFieldDef[]
}

/** Builds an array of { label, value } from non-null spec fields for a section. */
export function pickSectionItems(
  specs: SpecsData,
  section: SpecSectionDefinition,
): { label: string; value: string }[] {
  return section.fields
    .filter((f) => specs[f.column] !== null)
    .map((f) => ({
      label: f.label,
      value: specs[f.column] as string,
    }))
}

export const SPEC_SECTIONS: SpecSectionDefinition[] = [
  {
    heading: 'Desempenho',
    icon: Zap,
    fields: [
      { column: 'acceleration_0_100', label: 'Aceleração 0-100 km/h' },
      { column: 'top_speed_g', label: 'Velocidade máxima (G)' },
      { column: 'top_speed_e', label: 'Velocidade máxima (E)' },
      { column: 'weight_power_ratio', label: 'Peso/potência' },
      { column: 'weight_torque_ratio', label: 'Peso/torque' },
      { column: 'specific_power', label: 'Potência específica' },
      { column: 'specific_torque', label: 'Torque específico' },
    ],
  },
  {
    heading: 'Motor',
    icon: Engine,
    fields: [
      { column: 'engine_code', label: 'Código do motor' },
      { column: 'unit_displacement', label: 'Cilindrada unitária' },
      { column: 'displacement', label: 'Deslocamento' },
      { column: 'bore', label: 'Diâmetro do cilindro' },
      { column: 'stroke', label: 'Curso do pistão' },
      { column: 'cylinders', label: 'Cilindros' },
      { column: 'cylinders_arrangement', label: 'Disposição dos cilindros' },
      { column: 'valves_per_cylinder', label: 'Válvulas por cilindro' },
      { column: 'valve_control', label: 'Comando de válvulas' },
      { column: 'valve_variation', label: 'Variação do comando' },
      { column: 'tappets', label: 'Tuchos' },
      { column: 'aspiration', label: 'Aspiração' },
      { column: 'feeding', label: 'Alimentação' },
      { column: 'installation', label: 'Instalação' },
      { column: 'arrangement', label: 'Disposição' },
      { column: 'compression_ratio', label: 'Razão de compressão' },
      { column: 'drive_actuation', label: 'Acionam. do comando' },
      { column: 'power_hp_g', label: 'Potência máxima (G)' },
      { column: 'power_hp_e', label: 'Potência máxima (E)' },
      { column: 'max_power_rpm', label: 'Regime potência máx.' },
      { column: 'torque_g', label: 'Torque máximo (G)' },
      { column: 'torque_e', label: 'Torque máximo (E)' },
      { column: 'max_torque_rpm', label: 'Regime torque máx.' },
    ],
  },
  {
    heading: 'Transmissão',
    icon: Cog,
    fields: [
      { column: 'coupling', label: 'Acoplamento' },
      { column: 'gearbox', label: 'Câmbio' },
      { column: 'gearbox_code', label: 'Código do câmbio' },
      { column: 'gears', label: 'Marchas' },
      { column: 'traction', label: 'Tração' },
    ],
  },
  {
    heading: 'Dimensões',
    icon: Ruler,
    fields: [
      { column: 'height', label: 'Altura' },
      { column: 'width', label: 'Largura' },
      { column: 'length', label: 'Comprimento' },
      { column: 'wheelbase', label: 'Distância entre-eixos' },
      { column: 'front_track', label: 'Bitola dianteira' },
      { column: 'rear_track', label: 'Bitola traseira' },
      { column: 'weight', label: 'Peso' },
      { column: 'payload', label: 'Carga útil' },
      { column: 'trunk_capacity', label: 'Porta-malas' },
      { column: 'fuel_tank', label: 'Tanque de combustível' },
    ],
  },
  {
    heading: 'Consumo',
    icon: Fuel,
    fields: [
      { column: 'city_consumption_g', label: 'Consumo urbano (G)' },
      { column: 'highway_consumption_g', label: 'Consumo rodoviário (G)' },
      { column: 'city_range_g', label: 'Autonomia urbana (G)' },
      { column: 'highway_range_g', label: 'Autonomia rodoviária (G)' },
      { column: 'city_consumption_e', label: 'Consumo urbano (E)' },
      { column: 'highway_consumption_e', label: 'Consumo rodoviário (E)' },
      { column: 'city_range_e', label: 'Autonomia urbana (E)' },
      { column: 'highway_range_e', label: 'Autonomia rodoviária (E)' },
    ],
  },
  {
    heading: 'Freios',
    icon: Disc,
    fields: [
      { column: 'front_brakes', label: 'Dianteiros' },
      { column: 'rear_brakes', label: 'Traseiros' },
      { column: 'sidewall_height', label: 'Altura do flanco' },
    ],
  },
  {
    heading: 'Suspensão',
    icon: Car,
    fields: [
      { column: 'front_suspension', label: 'Dianteira' },
      { column: 'rear_suspension', label: 'Traseira' },
      { column: 'elastic_element', label: 'Elemento elástico' },
    ],
  },
  {
    heading: 'Aerodinâmica',
    icon: Wind,
    fields: [
      { column: 'frontal_area', label: 'Área frontal (A)' },
      { column: 'corrected_frontal_area', label: 'Área frontal corrigida' },
      { column: 'drag_coefficient', label: 'Coef. de arrasto (Cx)' },
    ],
  },
  {
    heading: 'Direção',
    icon: SteeringWheel,
    fields: [
      { column: 'steering_assist', label: 'Assistência' },
      { column: 'turning_diameter', label: 'Diâmetro de giro' },
    ],
  },
  {
    heading: 'Geral',
    icon: Info,
    fields: [
      { column: 'year', label: 'Ano' },
      { column: 'fuel', label: 'Combustível' },
      { column: 'configuration', label: 'Configuração' },
      { column: 'warranty', label: 'Garantia' },
      { column: 'generation', label: 'Geração' },
      { column: 'seats', label: 'Lugares' },
      { column: 'platform', label: 'Plataforma' },
      { column: 'doors', label: 'Portas' },
      { column: 'size', label: 'Porte' },
      { column: 'origin', label: 'Procedência' },
      { column: 'propulsion', label: 'Propulsão' },
      { column: 'series', label: 'Série' },
    ],
  },
]
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/vehicle-detail/spec-sections.ts
git commit -m "feat: add spec-sections config with column→section mapping"
```

---

### Task 15: Frontend — SpecItem and SpecSection components

**Files:**
- Create: `frontend/src/features/vehicle-detail/sections/SpecItem.tsx`
- Create: `frontend/src/features/vehicle-detail/sections/SpecSection.tsx`

**Interfaces:**
- Consumes: `SpecSectionDefinition`, `pickSectionItems` from Task 14
- Produces: `SpecItem` (single row), `SpecSection` (section wrapper)

- [ ] **Step 1: Create SpecItem.tsx**

```tsx
interface SpecItemProps {
  label: string
  value: string
  isLast: boolean
}

export function SpecItem({ label, value, isLast }: SpecItemProps) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-2 ${isLast ? '' : 'border-b border-border/50'} pb-2`}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}
```

- [ ] **Step 2: Create SpecSection.tsx**

```tsx
import type { LucideIcon } from 'lucide-react'

interface SpecItemData {
  label: string
  value: string
}

interface SpecSectionProps {
  heading: string
  icon: LucideIcon
  items: SpecItemData[]
}

export function SpecSection({ heading, icon: Icon, items }: SpecSectionProps) {
  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" />
        {heading}
      </h3>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className={`flex flex-wrap items-baseline justify-between gap-2 ${i < items.length - 1 ? 'border-b border-border/50' : 'border-0'} pb-2`}
          >
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="text-right text-sm font-medium text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/vehicle-detail/sections/SpecItem.tsx frontend/src/features/vehicle-detail/sections/SpecSection.tsx
git commit -m "feat: add SpecItem and SpecSection reusable components"
```

---

### Task 16: Frontend — Domain section components

**Files:**
- Create: All 10 domain section files under `sections/`

**Interfaces:**
- Consumes: `SPEC_SECTIONS`, `pickSectionItems`, `SpecSection` from Tasks 14/15
- Each receives `specs: SpecsData`, returns `SpecSection` or `null`

- [ ] **Step 1: Create all 10 domain section components**

Each follows the identical pattern — pick section by index in `SPEC_SECTIONS`, call `pickSectionItems`, render `SpecSection` or return `null`:

**PerformanceSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface PerformanceSectionProps {
  specs: SpecsData
}

export function PerformanceSection({ specs }: PerformanceSectionProps) {
  const section = SPEC_SECTIONS[0] // Desempenho
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**EngineSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface EngineSectionProps {
  specs: SpecsData
}

export function EngineSection({ specs }: EngineSectionProps) {
  const section = SPEC_SECTIONS[1] // Motor
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**TransmissionSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface TransmissionSectionProps {
  specs: SpecsData
}

export function TransmissionSection({ specs }: TransmissionSectionProps) {
  const section = SPEC_SECTIONS[2] // Transmissão
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**DimensionsSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface DimensionsSectionProps {
  specs: SpecsData
}

export function DimensionsSection({ specs }: DimensionsSectionProps) {
  const section = SPEC_SECTIONS[3] // Dimensões
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**ConsumptionSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface ConsumptionSectionProps {
  specs: SpecsData
}

export function ConsumptionSection({ specs }: ConsumptionSectionProps) {
  const section = SPEC_SECTIONS[4] // Consumo
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**BrakesSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface BrakesSectionProps {
  specs: SpecsData
}

export function BrakesSection({ specs }: BrakesSectionProps) {
  const section = SPEC_SECTIONS[5] // Freios
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**SuspensionSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface SuspensionSectionProps {
  specs: SpecsData
}

export function SuspensionSection({ specs }: SuspensionSectionProps) {
  const section = SPEC_SECTIONS[6] // Suspensão
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**AerodynamicsSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface AerodynamicsSectionProps {
  specs: SpecsData
}

export function AerodynamicsSection({ specs }: AerodynamicsSectionProps) {
  const section = SPEC_SECTIONS[7] // Aerodinâmica
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**SteeringSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface SteeringSectionProps {
  specs: SpecsData
}

export function SteeringSection({ specs }: SteeringSectionProps) {
  const section = SPEC_SECTIONS[8] // Direção
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

**GeneralSection.tsx:**
```tsx
import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface GeneralSectionProps {
  specs: SpecsData
}

export function GeneralSection({ specs }: GeneralSectionProps) {
  const section = SPEC_SECTIONS[9] // Geral
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/vehicle-detail/sections/
git commit -m "feat: add all 10 domain section spec components"
```

---

### Task 17: Frontend — VehicleTechnicalSpecs gate component

**Files:**
- Create: `frontend/src/features/vehicle-detail/VehicleTechnicalSpecs.tsx`

**Interfaces:**
- Consumes: `SpecsData` from Task 11, all section components from Task 16
- Produces: `VehicleTechnicalSpecs` — gate that shows "not available" or composes sections

- [ ] **Step 1: Create VehicleTechnicalSpecs.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Wrench } from 'lucide-react'
import type { SpecsData, VehicleSpecsResponse } from '../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from './spec-sections'
import { PerformanceSection } from './sections/PerformanceSection'
import { EngineSection } from './sections/EngineSection'
import { TransmissionSection } from './sections/TransmissionSection'
import { DimensionsSection } from './sections/DimensionsSection'
import { ConsumptionSection } from './sections/ConsumptionSection'
import { BrakesSection } from './sections/BrakesSection'
import { SuspensionSection } from './sections/SuspensionSection'
import { AerodynamicsSection } from './sections/AerodynamicsSection'
import { SteeringSection } from './sections/SteeringSection'
import { GeneralSection } from './sections/GeneralSection'

interface VehicleTechnicalSpecsProps {
  data: VehicleSpecsResponse
}

function countNonEmpty(specs: SpecsData): number {
  return Object.values(specs).filter((v) => v !== null).length - 2 // exclude sourceUrl, scrapedAt
}

export function VehicleTechnicalSpecs({ data }: VehicleTechnicalSpecsProps) {
  if (!data.specs) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Technical specifications not yet available
          </p>
        </CardContent>
      </Card>
    )
  }

  const { specs } = data
  const totalSpecs = countNonEmpty(specs)
  const title = data.brand && data.model
    ? `${data.brand} ${data.model}`
    : undefined

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-muted-foreground" />
            Technical Specifications
          </CardTitle>
          <Badge variant="secondary">{totalSpecs} specs</Badge>
        </div>
        {title && (
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <GeneralSection specs={specs} />
        <PerformanceSection specs={specs} />
        <EngineSection specs={specs} />
        <TransmissionSection specs={specs} />
        <DimensionsSection specs={specs} />
        <ConsumptionSection specs={specs} />
        <BrakesSection specs={specs} />
        <SuspensionSection specs={specs} />
        <AerodynamicsSection specs={specs} />
        <SteeringSection specs={specs} />

        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Source data scraped on{' '}
            {new Date(specs.scrapedAt).toLocaleDateString()}
          </span>
          <a
            href={specs.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            View source
            <ExternalLink className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/vehicle-detail/VehicleTechnicalSpecs.tsx
git commit -m "feat: add VehicleTechnicalSpecs gate component with empty state"
```

---

### Task 18: Frontend — VehicleHero component

**Files:**
- Create: `frontend/src/features/vehicle-detail/VehicleHero.tsx`

**Interfaces:**
- Consumes: `VehicleSpecsResponse` from Task 11, `FavoritesButton` from existing slice
- Produces: `VehicleHero` presentational component

- [ ] **Step 1: Check existing FavoritesButton props**

```bash
cat frontend/src/features/favorite-vehicle/FavoritesButton.tsx
```

- [ ] **Step 2: Create VehicleHero.tsx**

```tsx
import { Car, Bike, Fuel, Calendar, Hash } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FavoritesButton } from '../favorite-vehicle'
import { formatPrice, parsePrice } from '../../services/types'
import type { VehicleSpecsResponse } from '../../services/vehicleDetailApi'

interface VehicleHeroProps {
  data: VehicleSpecsResponse
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function VehicleHero({ data, isFavorite, onToggleFavorite }: VehicleHeroProps) {
  const name = data.brand && data.model
    ? `${data.brand} ${data.model}`
    : `FIPE ${data.fipeCode}`

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Vehicle Image Placeholder */}
        <div className="relative aspect-[4/3] w-full shrink-0 bg-muted lg:aspect-auto lg:h-auto lg:w-96">
          <div className="flex size-full min-h-64 items-center justify-center">
            <Car className="size-24 text-muted-foreground/30" />
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="size-5" />
              <Badge variant="secondary">Vehicle</Badge>
            </div>
            <FavoritesButton
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              size="default"
            />
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {name}
          </h1>

          {/* Current Price */}
          {data.price && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">
                FIPE Price
              </p>
              <p className="text-4xl font-bold text-foreground">
                {formatPrice(parsePrice(data.price))}
              </p>
            </div>
          )}

          {/* Vehicle Info Grid */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 text-sm">
              <Hash className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">FIPE:</span>
              <span className="font-medium">{data.fipeCode}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Year:</span>
              <span className="font-medium">{data.year}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Fuel className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fuel:</span>
              <span className="font-medium">{data.fuel ?? 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/vehicle-detail/VehicleHero.tsx
git commit -m "feat: add VehicleHero presentational component"
```

---

### Task 19: Frontend — VehicleDetailPage container

**Files:**
- Create: `frontend/src/features/vehicle-detail/VehicleDetailPage.tsx`

**Interfaces:**
- Consumes: `useVehicleSpecs` from Task 12, `useFavorites` from existing hook, `VehicleHero` from Task 18, `VehicleTechnicalSpecs` from Task 17
- Produces: Full detail page with loading/error/success states

- [ ] **Step 1: Check useFavorites API**

```bash
cat frontend/src/hooks/useFavorites.ts
```
Note: `useFavorites` returns `{ favorites, isLoading, error }`. Also check the `useAddFavorite` and `useRemoveFavorite` hooks. The page needs `isFavorite` + `toggleFavorite` — need to check how those work.

The `useFavorites` hook returns `favorites` (list), not an `isFavorite` helper. Check FavoritesButton for the pattern:

```bash
cat frontend/src/features/favorite-vehicle/FavoritesButton.tsx
```

- [ ] **Step 2: Create VehicleDetailPage.tsx**

```tsx
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { useVehicleSpecs } from '../../hooks/useVehicleSpecs'
import { useFavorites, useAddFavorite, useRemoveFavorite } from '../../hooks/useFavorites'
import { VehicleHero } from './VehicleHero'
import { VehicleTechnicalSpecs } from './VehicleTechnicalSpecs'
import type { VehicleType } from '../../services/types'

export function VehicleDetailPage() {
  const { fipeCode, yearCode } = useParams<{ fipeCode: string; yearCode: string }>()

  const {
    data: vehicleData,
    isLoading,
    error,
  } = useVehicleSpecs(fipeCode ?? '', yearCode ?? '')

  const { favorites } = useFavorites()
  const { addFavorite } = useAddFavorite()
  const { removeFavorite } = useRemoveFavorite()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 h-9 w-32" />
          <Skeleton className="mb-4 h-10 w-3/4" />
          <Skeleton className="mb-8 h-6 w-1/2" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !vehicleData) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link to="/">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="size-4" />
              Back to search
            </Button>
          </Link>
          <Card className="border-destructive/20 bg-destructive/10">
            <CardContent className="py-8 text-center">
              <p className="text-destructive">
                {error?.message || 'Vehicle not found'}
              </p>
              <Link to="/" className="mt-4 inline-block">
                <Button>Return to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const isFavorite = favorites.some(
    (f) => f.fipeCode === vehicleData.fipeCode && f.years?.some((y) => y.yearCode === vehicleData.yearCode),
  )

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(
        vehicleData.vehicleType as VehicleType,
        vehicleData.fipeCode,
      )
    } else {
      addFavorite(vehicleData.vehicleType as VehicleType, vehicleData.fipeCode)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="size-4" />
            Back to search
          </Button>
        </Link>

        <VehicleHero
          data={vehicleData}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
        />

        <VehicleTechnicalSpecs data={vehicleData} />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors (may need minor adjustments for `useFavorites` API — check the actual hooks).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/vehicle-detail/VehicleDetailPage.tsx
git commit -m "feat: add VehicleDetailPage container with loading/error/success states"
```

---

### Task 20: Frontend — Add route and wire everything

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/features/vehicle-detail/index.ts`

**Interfaces:**
- Consumes: `VehicleDetailPage` from Task 19
- Produces: New route and public exports

- [ ] **Step 1: Create index.ts**

```ts
export { VehicleDetailPage } from './VehicleDetailPage'
```

- [ ] **Step 2: Add route to App.tsx**

Read `frontend/src/App.tsx`, then add the import:

```ts
import { VehicleDetailPage } from './features/vehicle-detail'
```

Add the route inside `<Routes>`:

```tsx
<Route path="/vehicle/:fipeCode/:yearCode" element={<VehicleDetailPage />} />
```

The final Routes block:

```tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/favorites" element={<FavoritesPage />} />
  <Route path="/vehicle/:fipeCode/:yearCode" element={<VehicleDetailPage />} />
</Routes>
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/features/vehicle-detail/index.ts
git commit -m "feat: register /vehicle/:fipeCode/:yearCode route in App"
```

---

### Task 21: Frontend — run linter and verify build

- [ ] **Step 1: Run lint**

```bash
cd frontend && npm run lint
```
Expected: no errors (or only pre-existing ones).

- [ ] **Step 2: Run TypeScript build check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run backend tests one final time**

```bash
cd backend && npx vitest run
```
Expected: all tests PASS.

---

## Verification

After all tasks:
1. `GET /api/vehicles/<fipeCode>/<yearCode>/specs` returns 200 with specs or `specs: null`
2. `GET /api/vehicles/<unknownCode>/<yearCode>/specs` returns 404
3. `VehicleCard` shows "Ver Detalhes →" link on every year row
4. `/vehicle/:fipeCode/:yearCode` renders the full detail page
5. Hero section always renders
6. Technical specs card shows "not yet available" when no specs
7. Sections with no data are not rendered
8. Ethanol-only fields appear only when data exists
9. Footer shows scraped date + source link when specs present
