import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.leadAssignment.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.allocationState.deleteMany()
  await prisma.webhookEvent.deleteMany()
  await prisma.provider.deleteMany()

  // Seed providers — 8 providers, each serving specific services
  await prisma.provider.createMany({
    data: [
      { id: 1, name: 'Provider 1', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      { id: 2, name: 'Provider 2', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      { id: 3, name: 'Provider 3', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      { id: 4, name: 'Provider 4', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      { id: 5, name: 'Provider 5', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      { id: 6, name: 'Provider 6', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      { id: 7, name: 'Provider 7', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      { id: 8, name: 'Provider 8', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
    ],
  })

  // Seed initial allocation state for each service
  await prisma.allocationState.createMany({
    data: [
      { serviceType: 1, poolIndex: 0 },
      { serviceType: 2, poolIndex: 0 },
      { serviceType: 3, poolIndex: 0 },
    ],
  })

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
