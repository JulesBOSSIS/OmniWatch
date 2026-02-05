CREATE TABLE "guilds" (
	"id" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" integer PRIMARY KEY NOT NULL,
	"channelId" varchar NOT NULL,
	"status" varchar,
	"last_check" timestamp DEFAULT now() NOT NULL,
	"last_status_change" timestamp DEFAULT now() NOT NULL,
	"uptimeInterval" integer
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"url" varchar NOT NULL,
	"alias" varchar NOT NULL,
	"uptime_interval" integer DEFAULT 5 NOT NULL,
	"status" varchar,
	"last_check" timestamp,
	"last_status_change" timestamp,
	"setup_message_id" varchar,
	"setup_channel_id" varchar,
	CONSTRAINT "sites_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"login" varchar NOT NULL,
	"password" varchar NOT NULL
);
