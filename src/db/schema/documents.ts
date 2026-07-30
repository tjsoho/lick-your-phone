import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { proposals } from './proposals'

export const documentTypeEnum = pgEnum('document_type', ['contract', 'intake_export'])

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => proposals.id).notNull(),
  type: documentTypeEnum('type'),
  fileUrl: text('file_url'),
  fileHash: text('file_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const documentsRelations = relations(documents, ({ one }) => ({
  proposal: one(proposals, { fields: [documents.proposalId], references: [proposals.id] }),
}))
