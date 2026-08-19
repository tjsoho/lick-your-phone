import { pgTable, uuid, text, timestamp, integer, date, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { proposals } from './proposals'

export const paymentStatusEnum = pgEnum('payment_status', [
  'details_captured', 'scheduled', 'pending', 'settled', 'dishonoured', 'failed',
])

export const paymentScheduleStatusEnum = pgEnum('payment_schedule_status', [
  'scheduled', 'pending', 'settled', 'dishonoured', 'failed', 'cancelled',
])

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => proposals.id).notNull(),
  pinchPayerId: text('pinch_payer_id'),
  pinchSourceId: text('pinch_source_id'),
  cardLastFour: text('card_last_four'),
  cardBrand: text('card_brand'),
  cardExpiry: text('card_expiry'),
  status: paymentStatusEnum('status'),
  detailsCapturedAt: timestamp('details_captured_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  proposal: one(proposals, { fields: [payments.proposalId], references: [proposals.id] }),
  schedules: many(paymentSchedules),
}))

export const paymentSchedules = pgTable('payment_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull(),
  pinchPaymentId: text('pinch_payment_id'),
  amountCents: integer('amount_cents').notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  status: paymentScheduleStatusEnum('status'),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const paymentSchedulesRelations = relations(paymentSchedules, ({ one }) => ({
  payment: one(payments, { fields: [paymentSchedules.paymentId], references: [payments.id] }),
}))
