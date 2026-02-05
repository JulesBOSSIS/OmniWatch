import { integer, pgTable, varchar, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * Table principale pour stocker les sites à surveiller
 * Chaque site est associé à un serveur Discord (guild) et a un alias unique par serveur
 */
export const sites = pgTable("sites", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  url: varchar().notNull(), // URL du site à surveiller
  testUrl: varchar("test_url"), // URL de test du site
  secret: varchar("secret"), // Secret pour l'API de status
  alias: varchar().notNull(), // Nom court pour identifier le site
  guildId: varchar("guild_id").notNull(), // ID du serveur Discord
  uptimeInterval: integer("uptime_interval").notNull().default(5), // Intervalle de vérification en minutes
  consecutiveFailures: integer("consecutive_failures").notNull().default(0), // Nombre d'échecs consécutifs
  status: varchar(), // Statut actuel : "up" ou "down"
  lastCheck: timestamp("last_check"), // Date de la dernière vérification
  lastStatusChange: timestamp("last_status_change"), // Date du dernier changement de statut
  setupMessageId: varchar("setup_message_id"), // ID du message de configuration Discord
  setupChannelId: varchar("setup_channel_id"), // ID du channel où se trouve le message de config
}, (table) => ({
  // Un alias unique par serveur (on peut avoir le même alias sur différents serveurs)
  uniqueAliasPerGuild: unique().on(table.guildId, table.alias),
}));