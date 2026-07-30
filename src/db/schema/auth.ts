import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { proposals, internalNotes } from './proposals'

export const userRoleEnum = pgEnum('user_role', ['admin', 'sales', 'account_manager'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  role: userRoleEnum('role'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  proposals: many(proposals),
  internalNotes: many(internalNotes),
}))
