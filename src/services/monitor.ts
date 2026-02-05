import { loadSites, updateSiteStatus, Site } from "./storage";
import { Client } from "discord.js";
import { updateSetupMessage } from "./setup-message";

/**
 * Vérifie si un site est en ligne ou pas
 * Utilise une requête HEAD pour être plus rapide (on ne télécharge pas tout le contenu)
 * Timeout de 10 secondes pour éviter d'attendre trop longtemps
 */
export async function checkSite(site: Site): Promise<"up" | "down"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 secondes max

    const response = await fetch(site.url, {
      method: "HEAD", // On utilise HEAD au lieu de GET pour être plus rapide
      signal: controller.signal,
      headers: {
        "User-Agent": "Discord-Bot-Monitor/1.0",
      },
    });

    clearTimeout(timeout);

    // Si le code de réponse est OK (200-299), le site est en ligne
    if (response.ok) {
      return "up";
    } else {
      return "down";
    }
  } catch (error) {
    // En cas d'erreur (timeout, réseau, etc.), on considère le site comme hors ligne
    return "down";
  }
}

/**
 * Vérifie tous les sites qui doivent être vérifiés maintenant
 * Respecte l'intervalle de vérification défini pour chaque site
 */
export async function checkAllSites(client: Client): Promise<void> {
  const now = new Date();
  // On recharge les sites à chaque fois pour avoir les dernières données (au cas où l'intervalle aurait changé)
  const sites = await loadSites();

  for (const site of sites) {
    // On vérifie si on doit checker ce site maintenant
    // Soit il n'a jamais été vérifié, soit l'intervalle est écoulé
    const shouldCheck =
      !site.lastCheck ||
      now.getTime() - site.lastCheck.getTime() >=
      site.uptimeInterval * 60 * 1000; // Conversion minutes -> millisecondes

    if (shouldCheck) {
      const status = await checkSite(site);
      const previousStatus = site.status;
      const statusChanged = previousStatus && previousStatus !== status;
      
      // On met à jour le statut dans la base de données
      await updateSiteStatus(site.alias, status, site.guildId);

      // On met à jour le message de setup si il existe
      // On passe true si le statut a changé pour déclencher les logs
      await updateSetupMessage(client, site.alias, statusChanged, site.guildId);

      // Si le statut a changé, on notifie dans le serveur
      if (statusChanged) {
        await notifyStatusChange(site, status, client);
      }
    }
  }
}

/**
 * Envoie une notification dans le serveur quand le statut d'un site change
 * Trouve le premier channel où le bot peut envoyer des messages
 */
async function notifyStatusChange(
  site: Site,
  newStatus: "up" | "down",
  client: Client
): Promise<void> {
  try {
    const guild = await client.guilds.fetch(site.guildId);
    if (!guild) {
      return; // Le serveur n'existe plus ou le bot n'y est plus
    }

    const fullGuild = await guild.fetch();
    // On cherche un channel texte où le bot peut envoyer des messages
    const channels = fullGuild.channels.cache.filter(
      (channel) =>
        channel.isTextBased() &&
        channel.permissionsFor(client.user!)?.has("SendMessages")
    );

    // On prend le premier channel trouvé
    const channel = channels.first();
    if (channel && channel.isTextBased()) {
      const statusEmoji = newStatus === "up" ? "✅" : "❌";
      const statusText = newStatus === "up" ? "en ligne" : "hors ligne";
      await channel.send({
        content: `${statusEmoji} **${site.alias}** (${site.url}) est maintenant ${statusText}`,
      });
    }
  } catch (error) {
    console.error("Erreur lors de la notification de changement de statut:", error);
  }
}

/**
 * Démarre le monitoring des sites
 * Vérifie immédiatement au démarrage, puis toutes les X minutes
 */
export function startMonitoring(
  client: Client,
  intervalMinutes = 1
): void {
  // On vérifie immédiatement au démarrage pour avoir les statuts à jour
  checkAllSites(client);

  // Ensuite, on vérifie toutes les X minutes
  // Note: même si on vérifie toutes les minutes, chaque site ne sera vérifié que si son intervalle est écoulé
  setInterval(() => {
    checkAllSites(client);
  }, intervalMinutes * 60 * 1000);
}

