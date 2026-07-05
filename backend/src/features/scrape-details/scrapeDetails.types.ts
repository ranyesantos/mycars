/** Request body for POST /api/v1/scraping */
export interface EnqueueScrapingInput {
  vehicleId: number
  yearCode: string
  url: string
}

/** Data stored in the jobs table payload column for scraping jobs */
export interface ScrapingJobPayload {
  vehicleYearId: number
  url: string
}

/** Response from GET /api/v1/scraping/:jobId/status */
export interface JobStatusResponse {
  jobId: string
  status: string
  error: string | null
}

/** Allowed job status values */
export type JobStatus = 'pending' | 'processing' | 'retrying' | 'done' | 'failed'

/** Active statuses that indicate a job is still in-flight */
export const ACTIVE_JOB_STATUSES: JobStatus[] = ['pending', 'processing', 'retrying']
