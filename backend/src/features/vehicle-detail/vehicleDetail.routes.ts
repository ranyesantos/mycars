import { Router } from 'express'
import type { VehicleDetailRepository } from './vehicleDetail.repository'
import { asyncHandler } from '../../shared/utils/asyncHandler'
import { NotFoundError } from '../../shared/errors/NotFoundError'
import type { VehicleWithSpecs } from './vehicleDetail.repository'

interface VehicleDetailApiResponse {
  fipeCode: string
  vehicleType: string
  yearCode: string
  brand: string | null
  model: string | null
  year: string
  fuel: string | null
  price: string | null
  specs: {
    sourceUrl: string
    scrapedAt: string | Date
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
  } | null
}

function toApiResponse(vehicle: VehicleWithSpecs): VehicleDetailApiResponse {
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
      acceleration_0_100: s.acceleration0To100,
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
