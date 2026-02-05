import { date } from "drizzle-orm/mysql-core";
import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  url: varchar().notNull(),
  alias: varchar().notNull(),
});

export const guild = pgTable("guilds", {
    id: integer().primaryKey(),
});

export const message = pgTable("messages", {
    id: integer().primaryKey(),
    channelId: varchar().notNull(),
    status: varchar(),
    lastCheck: date(),
    lastStatusChange: date(),
    uptimeInterval: integer(),
});

export const user = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    login: varchar().notNull(),
    password: varchar().notNull(),
});