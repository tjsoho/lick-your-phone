import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './auth'

export const actorTypeEnum = pgEnum('actor_type', ['staff', 'client', 'system'])

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  actorId: uuid('actor_id'),
  actorType: actorTypeEnum('actor_type'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  actor: one(users, { fields: [auditEvents.actorId], references: [users.id] }),
}))
