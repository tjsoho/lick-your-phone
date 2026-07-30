import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { services } from './services'
import { states } from './clients'
import { proposals } from './proposals'

export const fieldTypeEnum = pgEnum('field_type', [
  'text', 'textarea', 'email', 'phone', 'abn', 'address',
  'radio', 'checkbox', 'multiselect', 'file', 'matrix',
  'repeatable_group', 'provider_picker', 'static_content',
])

export const conditionTypeEnum = pgEnum('condition_type', [
  'service_signed', 'venue_state', 'answer_equals',
])

export const intakeQuestions = pgTable('intake_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageNumber: integer('page_number').notNull(),
  section: text('section'),
  fieldLabel: text('field_label').notNull(),
  fieldType: fieldTypeEnum('field_type'),
  options: jsonb('options'),
  required: boolean('required').default(false),
  sequence: integer('sequence').notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const intakeQuestionsRelations = relations(intakeQuestions, ({ many }) => ({
  conditions: many(intakeConditions),
  responses: many(intakeResponses),
}))

export const intakeConditions = pgTable('intake_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id').references(() => intakeQuestions.id).notNull(),
  conditionType: conditionTypeEnum('condition_type'),
  conditionServiceId: uuid('condition_service_id').references(() => services.id),
  conditionStateId: uuid('condition_state_id').references(() => states.id),
  conditionQuestionId: uuid('condition_question_id').references(() => intakeQuestions.id),
  conditionValue: text('condition_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const intakeConditionsRelations = relations(intakeConditions, ({ one }) => ({
  question: one(intakeQuestions, { fields: [intakeConditions.questionId], references: [intakeQuestions.id] }),
  conditionService: one(services, { fields: [intakeConditions.conditionServiceId], references: [services.id] }),
  conditionState: one(states, { fields: [intakeConditions.conditionStateId], references: [states.id] }),
  conditionQuestion: one(intakeQuestions, { fields: [intakeConditions.conditionQuestionId], references: [intakeQuestions.id] }),
}))

export const intakeResponses = pgTable('intake_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => proposals.id).notNull(),
  questionId: uuid('question_id').references(() => intakeQuestions.id).notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const intakeResponsesRelations = relations(intakeResponses, ({ one }) => ({
  proposal: one(proposals, { fields: [intakeResponses.proposalId], references: [proposals.id] }),
  question: one(intakeQuestions, { fields: [intakeResponses.questionId], references: [intakeQuestions.id] }),
}))
