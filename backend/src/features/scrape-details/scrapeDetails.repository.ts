import type { PrismaClient } from '@prisma/client'
import type { JobStatus, ScrapingJobPayload } from './scrapeDetails.types'

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
        status: { in: ['pending', 'processing', 'retrying'] },
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

  /** Update job status to done. */
  async markJobDone(jobId: string): Promise<void> {
    await this.db.job.update({
      where: { jobId },
      data: { status: 'done', updatedAt: new Date(), attempts: { increment: 1 } },
    })
  }

  /** Update job status to failed with an error message. */
  async markJobFailed(jobId: string, error: string): Promise<void> {
    await this.db.job.update({
      where: { jobId },
      data: { status: 'failed', error, updatedAt: new Date(), attempts: { increment: 1 } },
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
    engine: string | null,
    powerHp: string | null,
    torque: string | null,
    transmission: string | null,
    fuelType: string | null,
    consumptionCity: string | null,
    consumptionHighway: string | null,
    rawData: string,
  ): Promise<void> {
    await this.db.$transaction([
      this.db.technicalSpecs.upsert({
        where: { vehicleYearId },
        create: {
          vehicleYearId,
          sourceUrl,
          engine,
          powerHp,
          torque,
          transmission,
          fuelType,
          consumptionCity,
          consumptionHighway,
          rawData,
          scrapedAt: new Date(),
        },
        update: {
          sourceUrl,
          engine,
          powerHp,
          torque,
          transmission,
          fuelType,
          consumptionCity,
          consumptionHighway,
          rawData,
          scrapedAt: new Date(),
        },
      }),
      this.db.job.update({
        where: { jobId },
        data: { status: 'done', updatedAt: new Date(), attempts: { increment: 1 } },
      }),
    ])
  }
}
