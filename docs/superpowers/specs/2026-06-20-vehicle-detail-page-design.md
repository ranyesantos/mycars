# Vehicle Detail Page & Technical Specs Design

**Date:** 2026-06-20
**Branch:** feat/details-scraping
**Phase:** Phase 1 — Vehicle detail page with technical specifications

---

## Overview

A dedicated full-page detail view for a specific vehicle year, composed of a hero section (always visible) and a technical specifications card (visible only when scraped data exists). The specs card is built from composable sub-components — one per section — grouped by a static frontend config.

A "Ver Detalhes" button appears on every year row in `VehicleCard`, navigating to this page.

---

## Database Schema

### `technical_specs` — full column expansion

All ~70 columns are flat on the table. Columns that have ethanol variants get `_g` / `_e` suffixes.

**General** (12 columns)

| Column | Source label |
|---|---|
| `year` | "Ano" |
| `fuel` | "Combustível" |
| `configuration` | "Configuração" |
| `warranty` | "Garantia" |
| `generation` | "Geração" |
| `seats` | "Lugares" |
| `platform` | "Plataforma" |
| `doors` | "Portas" |
| `size` | "Porte" |
| `origin` | "Procedência" |
| `propulsion` | "Propulsão" |
| `series` | "Série" |

**Performance — Desempenho** (7 columns)

| Column | Source label |
|---|---|
| `acceleration_0_100` | "Aceleração 0-100 km/h" |
| `top_speed_g` | "Velocidade máxima" |
| `top_speed_e` | "Velocidade máxima (E)" |
| `weight_power_ratio` | "Peso/potência" |
| `weight_torque_ratio` | "Peso/torque" |
| `specific_power` | "Potência específica" |
| `specific_torque` | "Torque específico" |

**Engine — Motor** (22 columns)

| Column | Source label |
|---|---|
| `engine_code` | "Código do motor" |
| `unit_displacement` | "Cilindrada unitária" |
| `displacement` | "Deslocamento" |
| `bore` | "Diâmetro do cilindro" |
| `stroke` | "Curso do pistão" |
| `cylinders` | "Cilindros" |
| `cylinders_arrangement` | — (part of "Cilindros", e.g. "8 em V") |
| `valves_per_cylinder` | "Válvulas por cilindro" |
| `valve_control` | "Comando de válvulas" |
| `valve_variation` | "Variação do comando" |
| `tappets` | "Tuchos" |
| `aspiration` | "Aspiração" |
| `feeding` | "Alimentação" |
| `installation` | "Instalação" |
| `arrangement` | "Disposição" |
| `compression_ratio` | "Razão de compressão" |
| `drive_actuation` | "Acionam. do comando" |
| `power_hp_g` | "Potência máxima" |
| `power_hp_e` | "Potência máxima (E)" |
| `max_power_rpm` | "Regime potência máx." |
| `torque_g` | "Torque máximo" |
| `torque_e` | "Torque máximo (E)" |
| `max_torque_rpm` | "Regime torque máx." |

**Transmission — Transmissão** (5 columns)

| Column | Source label |
|---|---|
| `coupling` | "Acoplamento" |
| `gearbox` | "Câmbio" |
| `gearbox_code` | "Código do câmbio" |
| `gears` | "Marchas" |
| `traction` | "Tração" |

**Dimensions — Dimensões** (10 columns)

| Column | Source label |
|---|---|
| `height` | "Altura" |
| `width` | "Largura" |
| `length` | "Comprimento" |
| `wheelbase` | "Distância entre-eixos" |
| `front_track` | "Bitola dianteira" |
| `rear_track` | "Bitola traseira" |
| `weight` | "Peso" |
| `payload` | "Carga útil" |
| `trunk_capacity` | "Porta-malas" |

**Brakes — Freios** (3 columns)

| Column | Source label |
|---|---|
| `front_brakes` | "Dianteiros" |
| `rear_brakes` | "Traseiros" |
| `sidewall_height` | "Altura do flanco" |

**Aerodynamics — Aerodinâmica** (3 columns)

| Column | Source label |
|---|---|
| `frontal_area` | "Área frontal (A)" |
| `corrected_frontal_area` | "Área frontal corrigida" |
| `drag_coefficient` | "Coef. de arrasto (Cx)" |

**Steering — Direção** (2 columns)

| Column | Source label |
|---|---|
| `steering_assist` | "Assistência" |
| `turning_diameter` | "Diâmetro de giro" |

**Suspension — Suspensão** (3 columns)

| Column | Source label |
|---|---|
| `front_suspension` | "Dianteira" |
| `rear_suspension` | "Traseira" |
| `elastic_element` | "Elemento elástico" |

**Consumption & Autonomy — Consumo & Autonomia** (9 columns)

| Column | Source label | Notes |
|---|---|---|
| `city_consumption_g` | "Urbano (G)" | All cars |
| `highway_consumption_g` | "Rodoviário (G)" | All cars |
| `city_range_g` | "Urbana (G)" | All cars |
| `highway_range_g` | "Rodoviária (G)" | All cars |
| `city_consumption_e` | "Urbano (E)" | Flex only, NULL otherwise |
| `highway_consumption_e` | "Rodoviário (E)" | Flex only, NULL otherwise |
| `city_range_e` | "Urbana (E)" | Flex only, NULL otherwise |
| `highway_range_e` | "Rodoviária (E)" | Flex only, NULL otherwise |
| `fuel_tank` | "Tanque de combustível" | All cars |

**Metadata** (kept from current schema)

| Column | Notes |
|---|---|
| `source_url` | TEXT NOT NULL |
| `raw_data` | TEXT — full JSON catch-all |
| `scraped_at` | DATETIME NOT NULL |

### Column renaming

Existing columns that get `_g` suffix (migration handles this):

| Old name | New name |
|---|---|
| `power_hp` | `power_hp_g` |
| `torque` | `torque_g` |
| `consumption_city` | `consumption_city_g` |
| `consumption_highway` | `consumption_highway_g` |
| `transmission` | _removed, replaced by `gearbox`_ |
| `engine` | _removed, replaced by `engine_code` + `displacement`_ |
| `fuel_type` | _removed, replaced by `fuel`_ |

---

## Backend

### New endpoint: `GET /api/vehicles/:fipeCode/:yearCode/specs`

Returns vehicle info + flat specs for a single vehicle year. The `specs` field is `null` when no `TechnicalSpecs` row exists.

**Response (200, specs present):**

```json
{
  "success": true,
  "data": {
    "fipeCode": "001004-9",
    "yearCode": "2004-1",
    "brand": "Audi",
    "model": "RS6 Avant",
    "year": "2004",
    "fuel": "Gasolina",
    "price": "R$ 85.000",
    "specs": {
      "sourceUrl": "https://...",
      "scrapedAt": "2026-06-20T...",
      "acceleration_0_100": "4,7 s",
      "top_speed_g": "250 km/h",
      "power_hp_g": "450 cv",
      "torque_g": "57,1 kgfm",
      "gearbox": "Automático",
      "...": "..."
    }
  }
}
```

**Response (200, no specs yet):**

```json
{
  "success": true,
  "data": {
    "fipeCode": "001004-9",
    "yearCode": "2004-1",
    "brand": "Audi",
    "model": "RS6 Avant",
    "year": "2004",
    "fuel": "Gasolina",
    "price": "R$ 85.000",
    "specs": null
  }
}
```

**Response (404 — vehicle not found):**

```json
{
  "success": false,
  "error": {
    "code": "VEHICLE_NOT_FOUND",
    "message": "No vehicle found with FIPE code 001004-9"
  }
}
```

### Backend slice

A lightweight read-only slice — route + repository only, no service layer needed:

```
backend/src/features/vehicle-detail/
  vehicleDetail.routes.ts       // GET /api/vehicles/:fipeCode/:yearCode/specs
  vehicleDetail.repository.ts   // find vehicle + year + specs in one query
  vehicleDetail.test.ts         // integration test
  index.ts
```

The route mounts at `/api/vehicles` in `server.ts`.

### Scraper mapping update

The `LABEL_TO_FIELD` map in `scraper.ts` expands to cover all ~70 columns. The scraper interface (`ScrapedVehicleDetails`) and the types file (`scraper.types.ts`) are updated with the full column set.

---

## Frontend

### New feature slice: `vehicle-detail`

```
frontend/src/features/vehicle-detail/
  VehicleDetailPage.tsx          // Page-level container (data fetching + state routing)
  VehicleHero.tsx                // Hero section — image, name, price, badges, favorite
  VehicleTechnicalSpecs.tsx      // Gate component — null check → sections or "not available"
  sections/
    SpecSection.tsx              // Reusable section wrapper (heading + icon + dl grid)
    SpecItem.tsx                 // Single label:value row with divider
    PerformanceSection.tsx       // "Desempenho"
    EngineSection.tsx            // "Motor"
    TransmissionSection.tsx      // "Transmissão"
    DimensionsSection.tsx        // "Dimensões"
    ConsumptionSection.tsx       // "Consumo"
    BrakesSection.tsx            // "Freios"
    SuspensionSection.tsx        // "Suspensão"
    AerodynamicsSection.tsx      // "Aerodinâmica"
    SteeringSection.tsx          // "Direção"
    GeneralSection.tsx           // "Geral"
  spec-sections.ts               // Static config: DB column → section + display label + icon
  index.ts
```

### Section grouping config

`spec-sections.ts` defines one array of `SpecSectionDefinition` objects. Each section sub-component reads its own fields from this config and renders only rows with non-null values. If **all** fields in a section are null, the section returns `null` (it disappears from the page).

```ts
interface SpecSectionDefinition {
  heading: string           // "Desempenho", "Motor", ...
  icon: LucideIcon
  fields: {
    column: keyof TechnicalSpecs
    label: string           // Display label, e.g. "Potência máxima (G)"
  }[]
}
```

### Component responsibilities

| Component | Role |
|---|---|
| `VehicleDetailPage` | Container — `useQuery` for specs, handles loading/error/success, composes Hero + Specs |
| `VehicleHero` | Presentational — receives vehicle info as props, renders image placeholder + name + price + badges + favorite button |
| `VehicleTechnicalSpecs` | Presentational — receives `specs \| null`. If null → "Technical specifications not yet available" placeholder. Otherwise renders section sub-components |
| `SpecSection` | Presentational — receives heading + icon + items[], renders a `<section>` with heading and `<dl>` grid |
| `SpecItem` | Presentational — single `<dt>`/`<dd>` row with border divider |
| Each domain section | Reads its fields from config, builds an items array from non-null data, passes to `SpecSection`. Returns null if no items |
| `spec-sections.ts` | Pure data — no component, no hook, just the config array |

### States

| State | What renders |
|---|---|
| **Loading** | Skeleton matching hero + specs card shape (using shadcn `Skeleton`) |
| **Error / not found** | Error card with message + "Back to search" link |
| **Vehicle found, no specs** | Hero section (full) + placeholder: "Technical specifications not yet available" |
| **Vehicle found, specs present** | Hero + `VehicleTechnicalSpecs` with sections |
| **Section has no data** | Section returns `null`, no gap, no heading rendered |

### "Ver Detalhes" button on VehicleCard

Each year row in `VehicleCard` gains a small navigation element on the right:

```
[2020] [Gasolina] [R$ 85.000] [Ver Detalhes →]
```

Implementation: a react-router-dom `Link` to `/vehicle/:fipeCode/:yearCode`. Always visible — no conditional logic. The detail page handles the "no specs yet" case.

### New route

Added to `App.tsx`:

```tsx
<Route path="/vehicle/:fipeCode/:yearCode" element={<VehicleDetailPage />} />
```

### New hook

```ts
// hooks/useVehicleSpecs.ts
export function useVehicleSpecs(fipeCode: string, yearCode: string) {
  return useQuery({
    queryKey: ['vehicle-specs', fipeCode, yearCode],
    queryFn: () => vehicleDetailApi.getVehicleSpecs(fipeCode, yearCode),
    enabled: !!fipeCode && !!yearCode,
  })
}
```

---

## Visual Design (shadcn/tailwind)

Following the pattern from `specs-details-design-describing.md`:

**Header:** `CardHeader` with wrench icon + "Technical Specifications" title in `font-semibold`, badge with spec count on the right, subtitle with vehicle name.

**Body:** `CardContent` with `<section>` blocks stacked in `space-y-6`. Each section has:
- Uppercase heading (`h3`, `text-sm font-semibold uppercase tracking-wide text-muted-foreground`)
- `<dl>` grid (`grid gap-x-6 gap-y-2 sm:grid-cols-2`)
- Each row: flex row with `<dt>` (label, `text-sm text-muted-foreground`) + `<dd>` (value, `text-sm font-medium text-foreground`)
- Row dividers (`border-b border-border/50 pb-2`), last row no divider (`last:border-0`)

**Footer:** Bottom bar with "scraped on" date + "View source" external link.

---

## Acceptance Criteria

### Backend
- [ ] Migration adds all ~70 new columns to `technical_specs`
- [ ] Existing columns `power_hp`, `torque`, `consumption_city`, `consumption_highway`, `transmission`, `engine`, `fuel_type` are migrated to new names
- [ ] `GET /api/vehicles/:fipeCode/:yearCode/specs` returns vehicle + specs when specs exist
- [ ] `GET /api/vehicles/:fipeCode/:yearCode/specs` returns vehicle with `specs: null` when no specs yet
- [ ] `GET /api/vehicles/:fipeCode/:yearCode/specs` returns 404 for unknown fipeCode
- [ ] Scraper `LABEL_TO_FIELD` map covers all new columns
- [ ] Scraper unit tests updated

### Frontend
- [ ] `VehicleCard` shows "Ver Detalhes" link on every year row
- [ ] `/vehicle/:fipeCode/:yearCode` route renders `VehicleDetailPage`
- [ ] Hero section always renders (image placeholder, name, price, badges, favorite button)
- [ ] Specs card shows "Technical specifications not yet available" when no data
- [ ] Each section sub-component renders its spec rows only when data is present
- [ ] Section returns null (not rendered) when all its fields are null
- [ ] Loading state shows skeleton matching the page layout
- [ ] Error/not-found state shows error card with back link
- [ ] Ethanol-only rows (consumption, power, torque, top speed) only appear for flex-fuel vehicles
- [ ] Footer shows "scraped on" date and "View source" link when specs present
