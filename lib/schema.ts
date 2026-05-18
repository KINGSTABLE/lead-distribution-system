import { integer, text, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const providers = sqliteTable('providers', {
  id:             integer('id').primaryKey(),
  name:           text('name').notNull(),
  serviceIds:     text('service_ids').notNull(), // stored as JSON string "[1,3]"
  monthlyQuota:   integer('monthly_quota').notNull().default(10),
  leadsThisMonth: integer('leads_this_month').notNull().default(0),
})

export const leads = sqliteTable('leads', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),
  phone:       text('phone').notNull(),
  city:        text('city').notNull(),
  serviceType: integer('service_type').notNull(),
  description: text('description').notNull(),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => ({
  phoneServiceUniq: uniqueIndex('leads_phone_service_uniq').on(t.phone, t.serviceType),
}))

export const leadAssignments = sqliteTable('lead_assignments', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  leadId:     integer('lead_id').notNull(),
  providerId: integer('provider_id').notNull(),
  assignedAt: integer('assigned_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const allocationState = sqliteTable('allocation_state', {
  serviceType: integer('service_type').primaryKey(),
  poolIndex:   integer('pool_index').notNull().default(0),
})

export const webhookEvents = sqliteTable('webhook_events', {
  id:          text('id').primaryKey(),
  payload:     text('payload').notNull(),
  status:      text('status').notNull().default('processed'),
  processedAt: integer('processed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ── Inferred types ─────────────────────────────────────────────────────────────
export type Provider       = typeof providers.$inferSelect
export type Lead           = typeof leads.$inferSelect
export type LeadAssignment = typeof leadAssignments.$inferSelect
