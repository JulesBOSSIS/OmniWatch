import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// On vérifie que l'URL de la base de données est définie
if (!process.env.DATABASE_URL) {
  throw new Error("La variable d'environnement DATABASE_URL n'est pas définie");
}

// On crée un pool de connexions PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// On crée l'instance Drizzle ORM avec le pool et le schéma
export const db = drizzle(pool, { schema });
export type Database = typeof db;

