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

/** Returns a singleton BullMQ Queue instance for enqueuing scraping jobs. */
export function getScrapingQueue(): IScrapingQueue {
  if (!queue) {
    const connection = getRedisConnection()
    queue = new Queue<ScrapingJobData>(SCRAPING_QUEUE_NAME, { connection })
  }
  return {
    async add(data: ScrapingJobData, opts?: JobsOptions): Promise<{ id: string }> {
      const job = await queue!.add('scrape', data, opts)
      return { id: job.id ?? data.jobId }
    },
  }
}
