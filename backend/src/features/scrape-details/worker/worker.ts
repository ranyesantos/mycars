import { Worker, Job as BullJob } from 'bullmq'
import { getRedisConnection } from '../../../shared/queue/connection'
import { SCRAPING_QUEUE_NAME } from '../../../shared/queue/scrapingQueue'
import type { ScrapingJobData } from '../../../shared/queue/scrapingQueue'
import { ScrapeDetailsRepository } from '../scrapeDetails.repository'
import { scrape } from '../scraper/scraper'
import { getDb } from '../../../db/index'

const MAX_JOB_ATTEMPTS = 3

const connection = getRedisConnection()
const db = getDb()
const repository = new ScrapeDetailsRepository(db)

const worker = new Worker<ScrapingJobData>(
  SCRAPING_QUEUE_NAME,
  async (job: BullJob<ScrapingJobData>) => {
    const { jobId, vehicleYearId, url } = job.data
    const attempt = job.attemptsMade + 1

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'job_received',
        jobId,
        vehicleYearId,
        url,
        attempt,
      }),
    )

    // Step 1 — Mark as processing
    await repository.markJobProcessing(jobId)

    // Step 2 — Scrape
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'scraping_started',
        jobId,
        url,
      }),
    )

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
  },
  {
    connection,
    concurrency: 1,
    // attempts and backoff are set per-job when enqueuing, but also set defaults here
    // in case the job was re-queued manually without options
    limiter: {
      max: 1,
      duration: 1000,
    },
  },
)

// Retry event — update status before BullMQ retries
worker.on('active', async (job: BullJob<ScrapingJobData>) => {
  // Mark as retrying if this is not the first attempt
  if (job.attemptsMade > 0) {
    await repository.markJobRetrying(job.data.jobId)
  }
})

// Permanent failure
worker.on('failed', async (job, error) => {
  if (job) {
    const attempts = job.attemptsMade + 1

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'job_permanently_failed',
        jobId: job.data.jobId,
        totalAttempts: MAX_JOB_ATTEMPTS,
        error: error.message,
      }),
    )

    await repository.markJobFailed(job.data.jobId, error.message, attempts)
  }
})

// --- Recovery sweeper ---
// Picks up jobs that were inserted into SQLite but never reached Redis
// (e.g., Redis was down when POST /api/v1/scraping was called).
// Runs every 30 seconds. Enqueues stale pending rows and marks failed
// rows that are too old to recover.
const SWEEP_INTERVAL_MS = 30_000
const STALE_THRESHOLD_MS = 60_000         // 1 minute — enqueue these
const ABANDON_THRESHOLD_MS = 3_600_000    // 1 hour — mark these permanently failed

const sweepInterval = setInterval(async () => {
  try {
    const stalePendingJobs = await repository.findStalePendingScrapingJobs(STALE_THRESHOLD_MS)

    for (const job of stalePendingJobs) {
      try {
        const payload = JSON.parse(job.payload) as { vehicleYearId: number; url: string }
        const { getScrapingQueue } = await import('../../../shared/queue/scrapingQueue')
        await getScrapingQueue().add(
          { jobId: job.jobId, vehicleYearId: payload.vehicleYearId, url: payload.url },
          { jobId: job.jobId, attempts: MAX_JOB_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } },
        )

        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            event: 'recovery_enqueued',
            jobId: job.jobId,
          }),
        )
      } catch {
        // Redis still down — if the job was created over an hour ago, give up
        const age = Date.now() - new Date(job.createdAt).getTime()
        if (age > ABANDON_THRESHOLD_MS) {
          await repository.markJobFailed(
            job.jobId,
            'Queue unavailable for over 1 hour — recovery abandoned',
            0, // never processed by BullMQ
          )

          console.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'error',
              event: 'recovery_abandoned',
              jobId: job.jobId,
              age_ms: age,
            }),
          )
        }
        // Otherwise leave it pending — we'll try again in the next sweep
      }
    }
  } catch (error) {
    // Sweeper errors must not crash the worker
    console.error('Recovery sweeper error:', error)
  }
}, SWEEP_INTERVAL_MS)

console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Scraping worker running',
    queue: SCRAPING_QUEUE_NAME,
    recoverySweepIntervalMs: SWEEP_INTERVAL_MS,
  }),
)

// --- Graceful shutdown ---
function gracefulShutdown(signal: string): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'worker_shutdown',
      signal,
    }),
  )

  clearInterval(sweepInterval)
  worker.close().then(() => process.exit(0))
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
