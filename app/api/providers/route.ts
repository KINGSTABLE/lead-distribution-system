import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDB } from '@/lib/db'
import { providers, leadAssignments, leads } from '@/lib/schema'

export const runtime = 'edge'

export async function GET() {
  const db = getDB()

  const allProviders = await db.select().from(providers).orderBy(providers.id)

  const allAssignments = await db
    .select({
      id:          leadAssignments.id,
      leadId:      leadAssignments.leadId,
      providerId:  leadAssignments.providerId,
      assignedAt:  leadAssignments.assignedAt,
      leadName:    leads.name,
      leadPhone:   leads.phone,
      leadCity:    leads.city,
      serviceType: leads.serviceType,
      description: leads.description,
      createdAt:   leads.createdAt,
    })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .orderBy(leadAssignments.assignedAt)

  return NextResponse.json(
    allProviders.map((p) => {
      const assignments = allAssignments
        .filter((a) => a.providerId === p.id)
        .map((a) => ({
          id:         a.id,
          assignedAt: a.assignedAt,
          lead: {
            id:          a.leadId,
            name:        a.leadName,
            phone:       a.leadPhone,
            city:        a.leadCity,
            serviceType: a.serviceType,
            description: a.description,
            createdAt:   a.createdAt,
          },
        }))

      return {
        id:             p.id,
        name:           p.name,
        serviceIds:     JSON.parse(p.serviceIds) as number[],
        monthlyQuota:   p.monthlyQuota,
        leadsThisMonth: p.leadsThisMonth,
        remaining:      p.monthlyQuota - p.leadsThisMonth,
        assignments,
      }
    })
  )
}
