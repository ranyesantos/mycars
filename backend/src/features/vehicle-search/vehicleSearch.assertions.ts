import { NotFoundError } from '../../shared/errors/NotFoundError'
import type { Vehicle } from '@prisma/client'
import type { VehicleYear } from '@prisma/client'
import type { FipeYear, FipeYearDetail } from '../../shared/services/fipe/fipe.types'

/** Assert a vehicle exists, with type narrowing. */
export function assertVehicleExists(
  vehicle: Vehicle | null,
  fipeCode: string,
): asserts vehicle is Vehicle {
  if (!vehicle) {
    throw new NotFoundError('VEHICLE_NOT_FOUND', `Vehicle ${fipeCode} not found`)
  }
}

/** Assert a year row exists for a given vehicle, with type narrowing. */
export function assertYearExists(
  year: VehicleYear | null,
  yearCode: string,
): asserts year is VehicleYear {
  if (!year) {
    throw new NotFoundError('YEAR_NOT_FOUND', `Year ${yearCode} not found for this vehicle`)
  }
}

/** Assert the FIPE API returned at least one year. */
export function assertYearsNotEmpty(years: FipeYear[]): void {
  if (years.length === 0) {
    throw new NotFoundError('FIPE_CODE_NOT_FOUND', 'No vehicles found for this FIPE code')
  }
}

/** Assert the FIPE API returned details for a specific year. */
export function assertYearDetailAvailable(
  detail: FipeYearDetail | null,
): asserts detail is FipeYearDetail {
  if (!detail) {
    throw new NotFoundError(
      'YEAR_NOT_AVAILABLE',
      'Year detail not available for this vehicle',
    )
  }
}
