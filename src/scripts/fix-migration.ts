/**
 * Script pour marquer la migration comme appliquée si les tables existent déjà
 * Usage: npx tsx src/scripts/fix-migration.ts
 */
import "dotenv/config";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";

async function fixMigration() {
  try {
    // Vérifier si la table __drizzle_migrations existe
    const migrationsTableExists = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      )`
    );

    if (!migrationsTableExists.rows[0]?.exists) {
      console.log("Création de la table __drizzle_migrations...");
      await db.execute(
        sql`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )`
      );
    }

    // Vérifier si la migration est déjà enregistrée
    const migrationExists = await db.execute(
      sql`SELECT * FROM "__drizzle_migrations" WHERE hash = $1`,
      ["0000_broken_lifeguard"]
    );

    if (migrationExists.rows.length > 0) {
      console.log("✅ La migration est déjà marquée comme appliquée.");
      return;
    }

    // Vérifier si toutes les tables existent
    const tablesToCheck = ["sites", "guilds", "messages", "users"];
    const existingTables: string[] = [];

    for (const tableName of tablesToCheck) {
      const tableExists = await db.execute(
        sql`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );

      if (tableExists.rows[0]?.exists) {
        existingTables.push(tableName);
        console.log(`✅ Table '${tableName}' existe`);
      } else {
        console.log(`❌ Table '${tableName}' n'existe pas`);
      }
    }

    // Si toutes les tables existent, marquer la migration comme appliquée
    if (existingTables.length === tablesToCheck.length) {
      console.log("\nToutes les tables existent. Marquage de la migration comme appliquée...");
      await db.execute(
        sql`INSERT INTO "__drizzle_migrations" (hash, created_at) 
        VALUES ($1, $2)`,
        ["0000_broken_lifeguard", Date.now()]
      );
      console.log("✅ Migration marquée comme appliquée!");
    } else {
      console.log("\n⚠️  Certaines tables manquent. Veuillez appliquer la migration manuellement.");
      console.log("Vous pouvez exécuter: npx drizzle-kit push");
    }
  } catch (error: unknown) {
    const err = error as { message: string; code?: string };
    console.error("Erreur:", err.message);
    if (err.code === "42P01") {
      console.log("\nLa table __drizzle_migrations n'existe pas. Création...");
      try {
        await db.execute(
          sql`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
          )`
        );
        console.log("Table créée. Réessayez le script.");
      } catch (createError: unknown) {
        console.error("Erreur lors de la création:", (createError as Error).message);
      }
    }
  } finally {
    await pool.end();
  }
}

fixMigration();

