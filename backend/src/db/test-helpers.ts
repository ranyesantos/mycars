import { PrismaClient } from '../generated/prisma/client'
import { createPgliteAdapter } from 'prisma-pglite'

export async function createTestDb(): Promise<PrismaClient> {
  const adapter = await createPgliteAdapter({
    prismaConfigPath: 'prisma.config.ts',
    resetDatabase: true,
  })
  return new PrismaClient({ adapter })
}

export async function clearTestDb(db: PrismaClient): Promise<void> {
  await db.job.deleteMany()
  await db.technicalSpecs.deleteMany()
  await db.vehicleYear.deleteMany()
  await db.vehicle.deleteMany()
}

export async function closeTestDb(db: PrismaClient | undefined): Promise<void> {
  if (db) {
    await db.$disconnect()
  }
}
