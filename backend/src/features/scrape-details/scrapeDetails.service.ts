import { createHash } from 'node:crypto'
import { v4 as uuidv4 } from 'uuid'
import type { ScrapeDetailsRepository } from './scrapeDetails.repository'
import type { IScrapingQueue } from '../../shared/queue/scrapingQueue'
import type { EnqueueScrapingInput, JobStatusResponse } from './scrapeDetails.types'
import { NotFoundError } from '../../shared/errors/NotFoundError'
import { AppError } from '../../shared/errors/AppError'

/**
 * Handles enqueuing scraping jobs and polling job status.
 *
 * Validates the request, checks idempotency, creates a job row,
 * and enqueues the work to BullMQ. The worker handles the actual
 * scraping and persistence.
 */
export class ScrapeDetailsService {
  constructor(
    private readonly repository: ScrapeDetailsRepository,
    private readonly scrapingQueue: IScrapingQueue,
  ) {}

  /** Enqueue a scraping job for the given vehicle year and URL. */
  async enqueue(input: EnqueueScrapingInput): Promise<{ jobId: string; status: string }> {
    // Validate vehicle exists
    const vehicle = await this.repository.findVehicleById(input.vehicleId)
    if (!vehicle) {
      throw new NotFoundError(
        'VEHICLE_NOT_FOUND',
        `No vehicle found with id ${input.vehicleId}`,
      )
    }

    // Validate year exists for this vehicle
    const year = await this.repository.findYearByVehicleAndCode(
      input.vehicleId,
      input.yearCode,
    )
    if (!year) {
      throw new NotFoundError(
        'YEAR_NOT_FOUND',
        `No year ${input.yearCode} found for vehicle ${input.vehicleId}`,
      )
    }

    // Check idempotency
    const idempotencyKey = createHash('sha256')
      .update(`${year.id}:${input.url}`)
      .digest('hex')

    const existing = await this.repository.findActiveJobByIdempotencyKey(idempotencyKey)
    if (existing) {
      return { jobId: existing.jobId, status: 'already_queued' }
    }

    // Create job and enqueue
    const jobId = uuidv4()
    const payload = { vehicleYearId: year.id, url: input.url }

    await this.repository.createJob(jobId, 'scrape_details', idempotencyKey, payload)

    try {
      await this.scrapingQueue.add(
        { jobId, vehicleYearId: year.id, url: input.url },
        { jobId, attempts: 3, backoff: { type: 'exponential', delay: 60_000 } },
      )
    } catch (error) {
      // Redis is down — leave the row as "pending" so the recovery sweeper
      // in the worker will pick it up when Redis comes back.
      throw new AppError(
        'QUEUE_UNAVAILABLE',
        'Queue temporarily unavailable, job will resume automatically',
        503,
        [error instanceof Error ? error.message : String(error)],
      )
    }

    return { jobId, status: 'pending' }
  }

  /** Get the current status of a scraping job. */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const job = await this.repository.findByJobId(jobId)
    if (!job) {
      throw new NotFoundError(
        'JOB_NOT_FOUND',
        `No job found with id ${jobId}`,
      )
    }

    return {
      jobId: job.jobId,
      status: job.status,
      error: job.error,
    }
  }
}
