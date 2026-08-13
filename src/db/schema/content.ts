import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { services } from './services'

export const pageTypeEnum = pgEnum('page_type', ['service', 'content'])
export const contentBlockTypeEnum = pgEnum('content_block_type', ['heading', 'paragraph', 'image', 'list', 'custom', 'logos'])

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
