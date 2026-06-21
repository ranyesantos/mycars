import type { PrismaClient } from '@prisma/client'
import type { JobStatus, ScrapingJobPayload } from './scrapeDetails.types'
import type { FullSpecFields } from './scraper/scraper.types'

/** Persistence layer for scrape-details — touches jobs, vehicles, vehicle_years, and technical_specs. */
export class ScrapeDetailsRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Find a vehicle by its numeric ID, or null. */
  async findVehicleById(id: number): Promise<{ id: number } | null> {
    return this.db.vehicle.findUnique({
      where: { id },
      select: { id: true },
    })
  }

  /** Find a vehicle year by vehicleId + yearCode, or null. Returns id only. */
  async findYearByVehicleAndCode(
    vehicleId: number,
    yearCode: string,
  ): Promise<{ id: number } | null> {
    return this.db.vehicleYear.findFirst({
      where: { vehicleId, yearCode },
      select: { id: true },
    })
  }

  /** Find an active job by idempotency key (pending, processing, or retrying). */
  async findActiveJobByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<{ jobId: string } | null> {
    return this.db.job.findFirst({
      where: {
        idempotencyKey,
        status: { in: ['pending', 'processing', 'retrying', 'done'] },
      },
      select: { jobId: true },
    })
  }

  /** Insert a new job row and return its jobId. */
  async createJob(
    jobId: string,
    type: string,
    idempotencyKey: string,
    payload: ScrapingJobPayload,
  ): Promise<void> {
    await this.db.job.create({
      data: {
        jobId,
        type,
        idempotencyKey,
        payload: JSON.stringify(payload),
        status: 'pending',
        attempts: 0,
      },
    })
  }

  /** Get a job by its external jobId (UUID), or null. */
  async findByJobId(jobId: string): Promise<{ jobId: string; status: string; error: string | null } | null> {
    return this.db.job.findUnique({
      where: { jobId },
      select: { jobId: true, status: true, error: true },
    })
  }

  /** Update job status to processing. */
  async markJobProcessing(jobId: string): Promise<void> {
    await this.db.job.update({
      where: { jobId },
      data: { status: 'processing', updatedAt: new Date() },
    })
  }

  /** Update job status to retrying. */
  async markJobRetrying(jobId: string): Promise<void> {
    await this.db.job.update({
      where: { jobId },
      data: { status: 'retrying', updatedAt: new Date() },
    })
  }

  /** Update job status to done with the actual attempt count. */
  async markJobDone(jobId: string, attempts: number): Promise<void> {
    await this.db.job.update({
      where: { jobId },
      data: { status: 'done', updatedAt: new Date(), attempts },
    })
  }

  /** Update job status to failed with an error message and the actual attempt count. */
  async markJobFailed(jobId: string, error: string, attempts: number): Promise<void> {
    await this.db.job.update({
      where: { jobId },
      data: { status: 'failed', error, updatedAt: new Date(), attempts },
    })
  }

  /** Find stale pending scraping jobs for the recovery sweeper. */
  async findStalePendingScrapingJobs(
    staleThresholdMs: number,
  ): Promise<{ jobId: string; payload: string; createdAt: Date }[]> {
    const cutoff = new Date(Date.now() - staleThresholdMs)
    return this.db.job.findMany({
      where: {
        type: 'scrape_details',
        status: 'pending',
        createdAt: { lt: cutoff },
      },
      select: { jobId: true, payload: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
  }

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
          acceleration0To100: fields.acceleration_0_100,
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
          acceleration0To100: fields.acceleration_0_100,
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
}
