import { pgTable, uuid, text, timestamp, integer, real, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const billingEnum = pgEnum('billing_type', ['one_off', 'recurring_monthly', 'in_kind'])

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  template: text('template'),
  billing: billingEnum('billing'),
  term: text('term'),
  targetPriceCents: integer('target_price_cents').notNull().default(0),
  discountPct: real('discount_pct'),
  discountWindowHours: integer('discount_window_hours'),
  priceDisplayPeriod: text('price_display_period'),
  requiresOtherService: boolean('requires_other_service').default(false),
  sequence: integer('sequence').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const servicesRelations = relations(services, ({ many }) => ({
  tiers: many(serviceTiers),
  inclusions: many(serviceInclusions),
  clientObligations: many(serviceClientObligations),
  disclaimers: many(serviceDisclaimers),
  pages: many(pages),
}))

export const serviceTiers = pgTable('service_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  targetPriceCents: integer('target_price_cents').notNull(),
  sequence: integer('sequence').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const serviceTiersRelations = relations(serviceTiers, ({ one }) => ({
  service: one(services, { fields: [serviceTiers.serviceId], references: [services.id] }),
}))

export const serviceInclusions = pgTable('service_inclusions', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  text: text('text').notNull(),
  sequence: integer('sequence'),
})

export const serviceInclusionsRelations = relations(serviceInclusions, ({ one }) => ({
  service: one(services, { fields: [serviceInclusions.serviceId], references: [services.id] }),
}))

export const serviceClientObligations = pgTable('service_client_obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  text: text('text').notNull(),
  sequence: integer('sequence'),
})

export const serviceClientObligationsRelations = relations(serviceClientObligations, ({ one }) => ({
  service: one(services, { fields: [serviceClientObligations.serviceId], references: [services.id] }),
}))

export const serviceDisclaimers = pgTable('service_disclaimers', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  text: text('text').notNull(),
  sequence: integer('sequence'),
})

export const serviceDisclaimersRelations = relations(serviceDisclaimers, ({ one }) => ({
  service: one(services, { fields: [serviceDisclaimers.serviceId], references: [services.id] }),
}))

// Forward reference for servicesRelations
import { pages } from './content'
