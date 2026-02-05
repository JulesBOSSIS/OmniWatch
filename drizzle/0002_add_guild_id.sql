-- Migration pour ajouter le champ guild_id et modifier la contrainte unique
-- Cette migration supprime les sites existants car ils n'ont pas de guildId associé
-- Les sites devront être réenregistrés avec /register dans chaque serveur

-- Supprimer l'ancienne contrainte unique sur alias si elle existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND constraint_name = 'sites_alias_unique'
    ) THEN
        ALTER TABLE "sites" DROP CONSTRAINT "sites_alias_unique";
    END IF;
END $$;

-- Supprimer tous les sites existants car ils n'ont pas de guildId
-- ATTENTION: Cette opération supprime toutes les données existantes
DELETE FROM "sites";

-- Ajouter la colonne guild_id si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND column_name = 'guild_id'
    ) THEN
        ALTER TABLE "sites" ADD COLUMN "guild_id" varchar NOT NULL;
    END IF;
END $$;

-- Ajouter la contrainte unique sur (guild_id, alias) si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'sites' 
        AND constraint_name = 'sites_guild_id_alias_unique'
    ) THEN
        ALTER TABLE "sites" ADD CONSTRAINT "sites_guild_id_alias_unique" UNIQUE("guild_id", "alias");
    END IF;
END $$;

