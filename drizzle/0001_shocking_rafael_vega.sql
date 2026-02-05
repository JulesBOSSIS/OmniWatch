ALTER TABLE "guilds" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "guilds" CASCADE;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "sites" DROP CONSTRAINT "sites_alias_unique";--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "test_url" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "guild_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_guild_id_alias_unique" UNIQUE("guild_id","alias");