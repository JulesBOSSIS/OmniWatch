/**
 * Script pour vérifier l'état actuel de la base de données
 */
import { db, pool } from "../db";
import { sql } from "drizzle-orm";

async function checkDatabase() {
  try {
    // Vérifier si la table sites existe
    const sitesTableExists = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sites'
      )`
    );

    console.log("Table 'sites' existe:", sitesTableExists.rows[0]?.exists);

    if (sitesTableExists.rows[0]?.exists) {
      // Vérifier les colonnes de la table sites
      const columns = await db.execute(
        sql`SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'sites'
        ORDER BY ordinal_position`
      );

      console.log("\nColonnes de la table 'sites':");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      columns.rows.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Vérifier les contraintes
      const constraints = await db.execute(
        sql`SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
        AND table_name = 'sites'`
      );

      console.log("\nContraintes de la table 'sites':");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constraints.rows.forEach((constraint: any) => {
        console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }

    // Vérifier les autres tables
    const allTables = await db.execute(
      sql`SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name`
    );

    console.log("\n\nToutes les tables dans la base de données:");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allTables.rows.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
  } catch (error) {
    console.error("Erreur lors de la vérification:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkDatabase();

