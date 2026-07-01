import type { IFipeClient } from '../../shared/services/fipe/fipe.types'
import type {
  SearchResponse,
  VehicleType,
  YearDetailResponse,
  BrandResponse,
  ModelResponse,
  CascadingYear,
  BrandModelPriceResponse,
} from './vehicleSearch.types'
import { NotFoundError } from '../../shared/errors/NotFoundError'
import type { VehicleSearchRepository } from './vehicleSearch.repository'
import { SearchResponseDto, YearDetailResponseDto } from './vehicleSearch.dto'

export class VehicleSearchService {
  constructor(
    private readonly fipeClient: IFipeClient,
    private readonly repository: VehicleSearchRepository,
  ) {}

  /** Search by FIPE code, returning years from cache or the FIPE API. */
  async searchByFipeCode(
    type: string,
    fipeCode: string,
  ): Promise<SearchResponse> {
    const cached = await this.repository.findVehicleWithYears(fipeCode)

    if (cached && cached.years.length > 0) {
      return SearchResponseDto.create({
        fipeCode: cached.fipeCode,
        vehicleType: cached.vehicleType as VehicleType,
        years: cached.years.map((y) => ({ code: y.yearCode, name: y.yearLabel })),
        brand: cached.brand,
        model: cached.model,
      })
    }

    const years = await this.fipeClient.fetchYears(type, fipeCode)
    if (years.length === 0) {
      throw new NotFoundError('FIPE_CODE_NOT_FOUND', 'No vehicles found for this FIPE code')
    }

    const vehicleId = cached
      ? cached.id
      : await this.repository.createVehicleWithYears(fipeCode, type, years)

    if (cached && cached.years.length === 0) {
      await this.repository.createYears(vehicleId, years)
    }

    return SearchResponseDto.create({
      fipeCode,
      vehicleType: type as VehicleType,
      years,
    })
  }

  /** Get detailed info for a single year, from cache or the FIPE API. */
  async getYearDetail(
    type: string,
    fipeCode: string,
    yearCode: string,
  ): Promise<YearDetailResponse> {
    const vehicle = await this.repository.findByFipeCode(fipeCode)
    if (!vehicle) {
      throw new NotFoundError('VEHICLE_NOT_FOUND', `Vehicle ${fipeCode} not found`)
    }

    const yearRow = await this.repository.findYearByCode(vehicle.id, yearCode)
    if (!yearRow) {
      throw new NotFoundError('YEAR_NOT_FOUND', `Year ${yearCode} not found for this vehicle`)
    }

    if (yearRow.fetchedAt) {
      return YearDetailResponseDto.create({
        vehicleId: vehicle.id,
        fipeCode,
        vehicleType: vehicle.vehicleType as VehicleType,
        yearCode: yearRow.yearCode,
        yearLabel: yearRow.yearLabel,
        brand: vehicle.brand,
        model: vehicle.model,
        price: yearRow.price,
        fuel: yearRow.fuel,
        referenceMonth: yearRow.referenceMonth,
        fuelAcronym: yearRow.fuelAcronym,
      })
    }

    const detail = await this.fipeClient.fetchYearDetail(type, fipeCode, yearCode)
    if (!detail) {
      throw new NotFoundError(
        'YEAR_NOT_AVAILABLE',
        'Year detail not available for this vehicle',
      )
    }

    await this.repository.updateYearDetail(yearRow.id, {
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
    })

    if (!vehicle.brand) {
      await this.repository.updateVehicleBrandModel(
        vehicle.id,
        detail.brand,
        detail.model,
      )
    }

    return YearDetailResponseDto.create({
      vehicleId: vehicle.id,
      fipeCode: vehicle.fipeCode,
      vehicleType: vehicle.vehicleType as VehicleType,
      yearCode: yearRow.yearCode,
      yearLabel: yearRow.yearLabel,
      brand: detail.brand,
      model: detail.model,
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
    })
  }

  /** List all brands for a vehicle type. */
  async getBrands(type: string): Promise<BrandResponse[]> {
    const brands = await this.fipeClient.fetchBrands(type)
    return brands.map((b) => ({ code: b.code, name: b.name }))
  }

  /** List all models for a brand. */
  async getModels(type: string, brandCode: string): Promise<ModelResponse[]> {
    const models = await this.fipeClient.fetchModels(type, brandCode)
    return models.map((m) => ({ code: m.code, name: m.name }))
  }

  /** List available years for a brand/model combination. No DB write — FIPE code not yet known. */
  async getYearsByBrandModel(
    type: string,
    brandCode: string,
    modelCode: number,
  ): Promise<CascadingYear[]> {
    const years = await this.fipeClient.fetchYearsByBrandModel(type, brandCode, modelCode)
    return years.map((y) => ({ code: y.code, name: y.name }))
  }

  /** Fetch price detail by brand/model/year. Does find-or-create of vehicle + year in DB. */
  async getPriceByBrandModel(
    type: string,
    brandCode: string,
    modelCode: number,
    yearCode: string,
  ): Promise<BrandModelPriceResponse> {
    const detail = await this.fipeClient.fetchPriceByBrandModel(type, brandCode, modelCode, yearCode)
    if (!detail) {
      throw new NotFoundError('YEAR_NOT_AVAILABLE', `No price data for year ${yearCode}`)
    }

    let vehicle = await this.repository.findByFipeCode(detail.codeFipe)
    if (!vehicle) {
      // Create new vehicle with the year from the API response
      const yearLabel = `${detail.modelYear} ${detail.fuel}`
      const vehicleId = await this.repository.createVehicleWithYears(detail.codeFipe, type, [
        { code: yearCode, name: yearLabel },
      ])
      const years = await this.repository.findYearsByVehicleId(vehicleId)
      const yearRow = years[0]
      await this.repository.updateYearDetail(yearRow.id, {
        price: detail.price,
        fuel: detail.fuel,
        referenceMonth: detail.referenceMonth,
        fuelAcronym: detail.fuelAcronym,
      })
      await this.repository.updateVehicleBrandModel(vehicleId, detail.brand, detail.model)
    } else {
      // Vehicle exists — add the year if missing, then update
      const yearRow = await this.repository.findYearByCode(vehicle.id, yearCode)
      if (!yearRow) {
        const yearLabel = `${detail.modelYear} ${detail.fuel}`
        await this.repository.createYears(vehicle.id, [{ code: yearCode, name: yearLabel }])
        const createdYears = await this.repository.findYearsByVehicleId(vehicle.id)
        const created = createdYears.find((y) => y.yearCode === yearCode)
        if (created) {
          await this.repository.updateYearDetail(created.id, {
            price: detail.price,
            fuel: detail.fuel,
            referenceMonth: detail.referenceMonth,
            fuelAcronym: detail.fuelAcronym,
          })
        }
      } else {
        await this.repository.updateYearDetail(yearRow.id, {
          price: detail.price,
          fuel: detail.fuel,
          referenceMonth: detail.referenceMonth,
          fuelAcronym: detail.fuelAcronym,
        })
      }
      if (!vehicle.brand) {
        await this.repository.updateVehicleBrandModel(vehicle.id, detail.brand, detail.model)
      }
    }

    return {
      fipeCode: detail.codeFipe,
      brand: detail.brand,
      model: detail.model,
      modelYear: detail.modelYear,
      price: detail.price,
      fuel: detail.fuel,
      referenceMonth: detail.referenceMonth,
      fuelAcronym: detail.fuelAcronym,
      vehicleType: detail.vehicleType,
    }
  }
}
