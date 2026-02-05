import { loadSites, updateSiteStatus, Site } from "./storage";
import { Client } from "discord.js";
import { updateSetupMessage } from "./setup-message";

/**
 * Perform a HEAD request to check site availability
 */
export async function checkSite(site: Site): Promise<"up" | "down"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(site.url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Discord-Bot-Monitor/1.0" },
    });

    clearTimeout(timeout);
    return response.ok ? "up" : "down";
  } catch {
    return "down";
  }
}

/**
 * Main check loop logic with retry resilience
 */
async function checkAllSites(client: Client): Promise<void> {
  const now = new Date();
  const sites = await loadSites();

  for (const site of sites) {
    const shouldCheck = !site.lastCheck || 
      now.getTime() - site.lastCheck.getTime() >= site.uptimeInterval * 60 * 1000;

    if (!shouldCheck) continue;

    const currentStatus = await checkSite(site);
    
    if (currentStatus === "up") {
      // Site is UP
      const statusChanged = site.status === "down";
      
      // Reset failures and set status to UP
      await updateSiteStatus(site.alias, "up", site.guildId, 0);
      await updateSetupMessage(client, site.alias, statusChanged, site.guildId);

      if (statusChanged) {
        await notifyStatusChange(site, "up", client);
      }
    } else {
      // Site is DOWN (potential)
      const newFailures = site.consecutiveFailures + 1;
      const threshold = 3;

      if (newFailures >= threshold) {
        // Confirmed DOWN
        const statusChanged = site.status !== "down";
        
        await updateSiteStatus(site.alias, "down", site.guildId, newFailures);
        await updateSetupMessage(client, site.alias, statusChanged, site.guildId);

        if (statusChanged) {
          await notifyStatusChange(site, "down", client);
        }
      } else {
        // Soft failure (waiting for retries)
        await updateSiteStatus(site.alias, site.status || "up", site.guildId, newFailures);
        // We update the message to refresh "Last check" but without status change
        await updateSetupMessage(client, site.alias, false, site.guildId);
        
        console.log(`[Monitor] ${site.alias} failing (${newFailures}/${threshold})...`);
      }
    }
  }
}

async function notifyStatusChange(
  site: Site,
  newStatus: "up" | "down",
  client: Client
): Promise<void> {
  try {
    const guild = await client.guilds.fetch(site.guildId);
    if (!guild) return;

    const fullGuild = await guild.fetch();
    const channel = fullGuild.channels.cache.find(
      (c) => c.isTextBased() && (client.user ? c.permissionsFor(client.user)?.has("SendMessages") : false)
    );

    if (channel && channel.isTextBased()) {
      const statusEmoji = newStatus === "up" ? "✅" : "❌";
      await channel.send({
        content: `${statusEmoji} **${site.alias}** (${site.url}) est maintenant ${newStatus === "up" ? "en ligne" : "hors ligne"}`,
      });
    }
  } catch (error) {
    console.error("[Monitor] Notification failed:", error);
  }
}

/**
 * Initializes the monitoring loop
 */
export function startMonitoring(client: Client, intervalMinutes = 1): void {
  checkAllSites(client);
  setInterval(() => checkAllSites(client), intervalMinutes * 60 * 1000);
}
