import { pgTable, uuid, text, timestamp, integer, pgEnum, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { states } from './clients'

export const providerTypeEnum = pgEnum('provider_type', ['photographer', 'videographer'])

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: providerTypeEnum('type'),
  description: text('description'),
  portfolioUrl: text('portfolio_url'),
  priceCents: integer('price_cents').default(0),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const providersRelations = relations(providers, ({ many }) => ({
  providerStates: many(providerStates),
}))

export const providerStates = pgTable('provider_states', {
  providerId: uuid('provider_id').references(() => providers.id).notNull(),
  stateId: uuid('state_id').references(() => states.id).notNull(),
}, (t) => [
  primaryKey({ columns: [t.providerId, t.stateId] }),
])

export const providerStatesRelations = relations(providerStates, ({ one }) => ({
  provider: one(providers, { fields: [providerStates.providerId], references: [providers.id] }),
  state: one(states, { fields: [providerStates.stateId], references: [states.id] }),
}))
