import type { PrismaClient, TechnicalSpecs } from '../../generated/prisma/client'

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
  acceleration0To100: string | null
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

  /** Map Prisma TechnicalSpecs to flat SpecsRow. */
  private toSpecsRow(s: TechnicalSpecs): SpecsRow {
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
      acceleration0To100: s.acceleration0To100,
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
