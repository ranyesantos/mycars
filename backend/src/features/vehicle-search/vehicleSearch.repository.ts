import type Database from 'better-sqlite3'
import type { Vehicle, VehicleYear, VehicleWithYears } from './vehicleSearch.types'

export class VehicleSearchRepository {
  constructor(private readonly db: Database.Database) {}

  findByFipeCode(fipeCode: string): Vehicle | null {
    return (
      (this.db
        .prepare('SELECT * FROM vehicles WHERE fipe_code = ?')
        .get(fipeCode) as Vehicle) ?? null
    )
  }

  createVehicle(fipeCode: string, vehicleType: string): number {
    const result = this.db
      .prepare('INSERT INTO vehicles (fipe_code, vehicle_type) VALUES (?, ?)')
      .run(fipeCode, vehicleType)
    return Number(result.lastInsertRowid)
  }

  createYears(
    vehicleId: number,
    years: { code: string; name: string }[],
  ): void {
    const stmt = this.db.prepare(
      'INSERT INTO vehicle_years (vehicle_id, year_code, year_label) VALUES (?, ?, ?)',
    )

    const insert = this.db.transaction(
      (rows: { code: string; name: string }[]) => {
        for (const row of rows) {
          stmt.run(vehicleId, row.code, row.name)
        }
      },
    )

    insert(years)
  }

  findYearsByVehicleId(vehicleId: number): VehicleYear[] {
    return this.db
      .prepare('SELECT * FROM vehicle_years WHERE vehicle_id = ?')
      .all(vehicleId) as VehicleYear[]
  }

  findVehicleWithYears(fipeCode: string): VehicleWithYears | null {
    const vehicle = this.findByFipeCode(fipeCode)
    if (!vehicle) return null

    const years = this.db
      .prepare(
        `SELECT year_code, year_label, price, fetched_at
         FROM vehicle_years WHERE vehicle_id = ?
         ORDER BY year_code`,
      )
      .all(vehicle.id) as VehicleWithYears['years']

    return { ...vehicle, years }
  }

  findYearByCode(vehicleId: number, yearCode: string): VehicleYear | null {
    return (
      (this.db
        .prepare('SELECT * FROM vehicle_years WHERE vehicle_id = ? AND year_code = ?')
        .get(vehicleId, yearCode) as VehicleYear) ?? null
    )
  }

  updateYearDetail(
    yearId: number,
    data: {
      price: string
      fuel: string
      referenceMonth: string
      fuelAcronym: string
    },
  ): void {
    this.db
      .prepare(
        `UPDATE vehicle_years
         SET price = ?, fuel = ?, reference_month = ?, fuel_acronym = ?, fetched_at = datetime('now')
         WHERE id = ?`,
      )
      .run(data.price, data.fuel, data.referenceMonth, data.fuelAcronym, yearId)
  }

  updateVehicleBrandModel(
    vehicleId: number,
    brand: string,
    model: string,
  ): void {
    this.db
      .prepare('UPDATE vehicles SET brand = ?, model = ? WHERE id = ?')
      .run(brand, model, vehicleId)
  }
}
