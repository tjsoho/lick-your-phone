import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { services } from './services'

export const pageTypeEnum = pgEnum('page_type', ['service', 'content'])
export const contentBlockTypeEnum = pgEnum('content_block_type', ['heading', 'paragraph', 'image', 'list', 'custom', 'logos', 'media_carousel', 'collage', 'results', 'offset_image'])

export const imagePositionEnum = pgEnum('image_position', ['left', 'right'])

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: pageTypeEnum('type'),
  slug: text('slug').unique(),
  title: text('title'),
  sequence: integer('sequence').notNull(),
  visible: boolean('visible').default(true),
  featuredImage: text('featured_image'),
  imagePosition: imagePositionEnum('image_position').default('right'),
  serviceId: uuid('service_id').references(() => services.id),
  /** Overrides for the page's fixed wording, keyed by slot. See src/lib/portal-copy. */
  copy: jsonb('copy').$type<Record<string, string>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const pagesRelations = relations(pages, ({ one, many }) => ({
  service: one(services, { fields: [pages.serviceId], references: [services.id] }),
  contentBlocks: many(contentBlocks),
}))

export const contentBlocks = pgTable('content_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id).notNull(),
  type: contentBlockTypeEnum('type'),
  content: jsonb('content'),
  sequence: integer('sequence'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  page: one(pages, { fields: [contentBlocks.pageId], references: [pages.id] }),
}))

/**
 * Agreement-wide settings, edited in admin and applied to every proposal.
 *
 * A single row, pinned to `id = 1`, so callers never have to pick between
 * rows and an update can never fork into two competing sets of terms.
 * Deliberately not `site_settings` — that name is already taken in this
 * database by an unrelated hold-page record.
 */
export const agreementSettings = pgTable('agreement_settings', {
  id: integer('id').primaryKey().default(1),
  termsAndConditions: text('terms_and_conditions'),
  postSignatureText: text('post_signature_text'),
  countersignatureImage: text('countersignature_image'),
  countersignatureName: text('countersignature_name'),
  countersignatureTitle: text('countersignature_title'),
  /** Workspace-wide portal wording (the `global` copy kind), keyed by slot. */
  portalCopy: jsonb('portal_copy').$type<Record<string, string>>().default({}).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
