-- Migration pour ajouter les colonnes manquantes à la table sites si elles n'existent pas déjà
-- Cette migration est idempotente et peut être exécutée plusieurs fois sans erreur

-- Ajouter uptime_interval si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND column_name = 'uptime_interval'
    ) THEN
        ALTER TABLE "sites" ADD COLUMN "uptime_interval" integer DEFAULT 5 NOT NULL;
    END IF;
END $$;

-- Ajouter status si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE "sites" ADD COLUMN "status" varchar;
    END IF;
END $$;

-- Ajouter last_check si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND column_name = 'last_check'
    ) THEN
        ALTER TABLE "sites" ADD COLUMN "last_check" timestamp;
    END IF;
END $$;

-- Ajouter last_status_change si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND column_name = 'last_status_change'
    ) THEN
        ALTER TABLE "sites" ADD COLUMN "last_status_change" timestamp;
    END IF;
END $$;

-- Ajouter setup_message_id si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND column_name = 'setup_message_id'
    ) THEN
        ALTER TABLE "sites" ADD COLUMN "setup_message_id" varchar;
    END IF;
END $$;

-- Ajouter setup_channel_id si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND column_name = 'setup_channel_id'
    ) THEN
        ALTER TABLE "sites" ADD COLUMN "setup_channel_id" varchar;
    END IF;
END $$;

-- Ajouter la contrainte unique sur alias si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND constraint_name = 'sites_alias_unique'
    ) THEN
        ALTER TABLE "sites" ADD CONSTRAINT "sites_alias_unique" UNIQUE("alias");
    END IF;
END $$;

