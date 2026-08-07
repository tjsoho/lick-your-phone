import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { proposals } from "./proposals";

export const states = pgTable("states", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const statesRelations = relations(states, ({ many }) => ({
  venues: many(venues),
  providerStates: many(providerStates),
}));

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  abn: text("abn"),
  entityName: text("entity_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  venues: many(venues),
  contacts: many(contacts),
  proposals: many(proposals),
}));

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id),
  name: text("name").notNull(),
  address: text("address"),
  stateId: uuid("state_id")
    .references(() => states.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const venuesRelations = relations(venues, ({ one, many }) => ({
  client: one(clients, { fields: [venues.clientId], references: [clients.id] }),
  state: one(states, { fields: [venues.stateId], references: [states.id] }),
  proposals: many(proposals),
}));

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
}));

// Forward-referenced in statesRelations
import { providerStates } from "./providers";
