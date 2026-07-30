import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './auth'
import { clients, venues } from './clients'
import { services, serviceTiers } from './services'
import { intakeResponses } from './intake'
import { documents } from './documents'
import { payments } from './payments'
import { integrationJobs } from './integrations'

export const proposalStatusEnum = pgEnum('proposal_status', ['draft', 'sent', 'signed', 'superseded'])

export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id),
  venueId: uuid('venue_id').references(() => venues.id),
  createdBy: uuid('created_by').references(() => users.id),
  status: proposalStatusEnum('status'),
  token: text('token').unique().notNull(),
  discountExpiresAt: timestamp('discount_expires_at', { withTimezone: true }),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  signerEmail: text('signer_email'),
  signerIp: text('signer_ip'),
  signerUserAgent: text('signer_user_agent'),
  documentHash: text('document_hash'),
  totalSnapshotCents: integer('total_snapshot_cents'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  client: one(clients, { fields: [proposals.clientId], references: [clients.id] }),
  venue: one(venues, { fields: [proposals.venueId], references: [venues.id] }),
  createdByUser: one(users, { fields: [proposals.createdBy], references: [users.id] }),
  lineItems: many(proposalLineItems),
  internalNotes: many(internalNotes),
  intakeResponses: many(intakeResponses),
  documents: many(documents),
  payments: many(payments),
  integrationJobs: many(integrationJobs),
}))

export const proposalLineItems = pgTable('proposal_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => proposals.id).notNull(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  serviceTierId: uuid('service_tier_id').references(() => serviceTiers.id),
  priceSnapshotCents: integer('price_snapshot_cents').notNull(),
  billing: text('billing').notNull(),
  term: text('term'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const proposalLineItemsRelations = relations(proposalLineItems, ({ one }) => ({
  proposal: one(proposals, { fields: [proposalLineItems.proposalId], references: [proposals.id] }),
  service: one(services, { fields: [proposalLineItems.serviceId], references: [services.id] }),
  serviceTier: one(serviceTiers, { fields: [proposalLineItems.serviceTierId], references: [serviceTiers.id] }),
}))

export const internalNotes = pgTable('internal_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => proposals.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const internalNotesRelations = relations(internalNotes, ({ one }) => ({
  proposal: one(proposals, { fields: [internalNotes.proposalId], references: [proposals.id] }),
  author: one(users, { fields: [internalNotes.authorId], references: [users.id] }),
}))
