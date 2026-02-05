import { loadSites, updateSiteStatus, Site } from "./storage";
import { Client } from "discord.js";

export async function checkSite(site: Site): Promise<"up" | "down"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

    const response = await fetch(site.url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Discord-Bot-Monitor/1.0",
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      return "up";
    } else {
      return "down";
    }
  } catch (error) {
    return "down";
  }
}

export async function checkAllSites(client: Client): Promise<void> {
  const sites = loadSites();
  const now = new Date();

  for (const site of sites) {
    // Vérifier si on doit checker ce site maintenant
    const shouldCheck =
      !site.lastCheck ||
      now.getTime() - site.lastCheck.getTime() >=
      site.uptimeInterval * 60 * 1000;

    if (shouldCheck) {
      const status = await checkSite(site);
      const previousStatus = site.status;
      updateSiteStatus(site.alias, status);

      // Notifier si le statut a changé
      if (previousStatus && previousStatus !== status) {
        await notifyStatusChange(site, status, client);
      }
    }
  }
}

async function notifyStatusChange(
  site: Site,
  newStatus: "up" | "down",
  client: Client
): Promise<void> {
  // Trouver tous les canaux où le bot peut envoyer des messages
  // Pour simplifier, on enverra dans le premier canal disponible de chaque serveur
  try {
    const guilds = await client.guilds.fetch();
    for (const guild of guilds.values()) {
      const fullGuild = await guild.fetch();
      const channels = fullGuild.channels.cache.filter(
        (channel) =>
          channel.isTextBased() &&
          channel.permissionsFor(client.user!)?.has("SendMessages")
      );

      const channel = channels.first();
      if (channel && channel.isTextBased()) {
        const statusEmoji = newStatus === "up" ? "✅" : "❌";
        const statusText = newStatus === "up" ? "en ligne" : "hors ligne";
        await channel.send({
          content: `${statusEmoji} **${site.alias}** (${site.url}) est maintenant ${statusText}`,
        });
      }
    }
  } catch (error) {
    console.error("Error notifying status change:", error);
  }
}

export function startMonitoring(
  client: Client,
  intervalMinutes = 1
): void {
  // Vérifier immédiatement au démarrage
  checkAllSites(client);

  // Puis vérifier toutes les minutes
  setInterval(() => {
    checkAllSites(client);
  }, intervalMinutes * 60 * 1000);
}

