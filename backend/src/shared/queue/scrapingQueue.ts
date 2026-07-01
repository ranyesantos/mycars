import { Queue, Worker, Job as BullJob } from 'bullmq'
import type { JobsOptions } from 'bullmq'
import { getRedisConnection } from './connection'

export interface ScrapingJobData {
  jobId: string
  vehicleYearId: number
  url: string
}

export interface IScrapingQueue {
  add(data: ScrapingJobData, opts?: JobsOptions): Promise<{ id: string }>
}

export const SCRAPING_QUEUE_NAME = 'scraping'

let queue: Queue<ScrapingJobData> | null = null

function getOrCreateQueue(): Queue<ScrapingJobData> {
  if (!queue) {
    const connection = getRedisConnection()
    queue = new Queue<ScrapingJobData>(SCRAPING_QUEUE_NAME, { connection })
  }
  return queue
}

/**
 * Returns a lazy singleton wrapper around a BullMQ Queue.
 * The Queue (and Redis connection) is only created on first use,
 * not at module load — so Redis is not required at application startup.
 */
export function getScrapingQueue(): IScrapingQueue {
  return {
    async add(data: ScrapingJobData, opts?: JobsOptions): Promise<{ id: string }> {
      const q = getOrCreateQueue()
      const job = await q.add('scrape', data, opts)
      return { id: job.id ?? data.jobId }
    },
  }
}
