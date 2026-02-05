/**
 * Script de migration pour transférer les données de sites.json vers la base de données
 * Usage: tsx src/scripts/migrate-sites.ts <guildId>
 * 
 * ATTENTION: Ce script nécessite maintenant un guildId car chaque site doit être associé à un serveur Discord.
 * Les sites seront migrés pour le serveur spécifié.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { db } from "../db";
import { sites } from "../db/schema";
import { addSite } from "../services/storage";

interface SiteFromJson {
  alias: string;
  url: string;
  uptimeInterval: number;
  lastCheck?: string;
  status?: "up" | "down";
  lastStatusChange?: string;
  setupMessageId?: string;
  setupChannelId?: string;
}

async function migrateSites() {
  const guildId = process.argv[2];
  
  if (!guildId) {
    console.error("❌ Erreur: Vous devez fournir un guildId en argument.");
    console.log("Usage: tsx src/scripts/migrate-sites.ts <guildId>");
    process.exit(1);
  }

  const STORAGE_FILE = join(process.cwd(), "sites.json");

  if (!existsSync(STORAGE_FILE)) {
    console.log("Aucun fichier sites.json trouvé. Rien à migrer.");
    return;
  }

  try {
    const data = readFileSync(STORAGE_FILE, "utf-8");
    const sitesFromJson = JSON.parse(data) as SiteFromJson[];

    if (sitesFromJson.length === 0) {
      console.log("Aucun site dans sites.json. Rien à migrer.");
      return;
    }

    console.log(`Migration de ${sitesFromJson.length} site(s)...`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const site of sitesFromJson) {
      try {
        await addSite({
          alias: site.alias,
          url: site.url,
          guildId: guildId,
          uptimeInterval: site.uptimeInterval,
          status: site.status,
          lastCheck: site.lastCheck ? new Date(site.lastCheck) : undefined,
          lastStatusChange: site.lastStatusChange
            ? new Date(site.lastStatusChange)
            : undefined,
          setupMessageId: site.setupMessageId,
          setupChannelId: site.setupChannelId,
        });
        migrated++;
        console.log(`✅ Migré: ${site.alias}`);
      } catch (error: any) {
        if (error?.message?.includes("existe déjà")) {
          skipped++;
          console.log(`⏭️  Ignoré (déjà présent): ${site.alias}`);
        } else {
          errors++;
          console.error(`❌ Erreur pour ${site.alias}:`, error.message);
        }
      }
    }

    console.log("\n=== Résumé de la migration ===");
    console.log(`✅ Migrés: ${migrated}`);
    console.log(`⏭️  Ignorés: ${skipped}`);
    console.log(`❌ Erreurs: ${errors}`);
  } catch (error) {
    console.error("Erreur lors de la migration:", error);
    process.exit(1);
  }
}

migrateSites()
  .then(() => {
    console.log("\nMigration terminée!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur fatale:", error);
    process.exit(1);
  });

