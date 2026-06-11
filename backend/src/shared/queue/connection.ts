import IORedis from 'ioredis'

let connection: IORedis | null = null

/** Returns a singleton Redis connection. Creates one if it doesn't exist. */
export function getRedisConnection(): IORedis {
  if (connection) return connection

  const host = process.env.REDIS_HOST ?? 'localhost'
  const port = Number(process.env.REDIS_PORT ?? 6379)

  connection = new IORedis({
    host,
    port,
    maxRetriesPerRequest: null, // Required by BullMQ
  })

  return connection
}
