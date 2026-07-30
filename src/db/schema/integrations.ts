import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { proposals } from './proposals'

export const integrationJobStatusEnum = pgEnum('integration_job_status', [
  'pending', 'processing', 'completed', 'failed',
])

export const integrationJobs = pgTable('integration_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => proposals.id).notNull(),
  type: text('type').notNull(),
  status: integrationJobStatusEnum('status'),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  attemptCount: integer('attempt_count').default(0),
  lastError: text('last_error'),
  lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const integrationJobsRelations = relations(integrationJobs, ({ one }) => ({
  proposal: one(proposals, { fields: [integrationJobs.proposalId], references: [proposals.id] }),
}))
