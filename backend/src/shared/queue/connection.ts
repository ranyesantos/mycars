export interface RedisConfig {
  host: string
  port: number
}

let config: RedisConfig | null = null

/**
 * Returns Redis connection configuration for BullMQ.
 * Returns a plain config object rather than a Redis instance so BullMQ
 * creates its own IORedis connection using its bundled ioredis version,
 * avoiding type incompatibilities between the project's ioredis and
 * BullMQ's bundled ioredis.
 */
export function getRedisConnection(): RedisConfig {
  if (config) return config

  const host = process.env.REDIS_HOST ?? 'localhost'
  const port = Number(process.env.REDIS_PORT ?? 6379)

  config = { host, port }
  return config
}
