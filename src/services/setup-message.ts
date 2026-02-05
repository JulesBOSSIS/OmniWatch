import { Client, EmbedBuilder } from "discord.js";
import { getSite, Site } from "./storage";
import { sendLogToAllGuilds } from "./log-channel";

interface SystemInfo {
  cpu?: { load: string; unit?: string };
  ram?: { used: string; total: string; unit?: string; percent: string };
  disks?: Array<{ mount: string; used: string; size: string; use_percent: string }>;
  uptime?: { readable: string; seconds: number };
  ssl?: { days_remaining: number; issuer?: string };
}

/**
 * Récupère les infos système depuis l'API de status
 */
async function fetchSystemInfo(site: Site): Promise<SystemInfo | null> {
  try {
    if (!site.testUrl) return null;
    const urlObj = new URL(site.testUrl);
    if (site.secret) urlObj.searchParams.set("secret", site.secret);
    
    const res = await fetch(urlObj.toString());
    return res.ok ? await res.json() as SystemInfo : null;
  } catch {
    return null;
  }
}

/**
 * Génère l'Embed standard du Dashboard (utilisé partout)
 */
export function generateSetupEmbed(site: Site, systemInfo: SystemInfo | null): EmbedBuilder {
  const isUp = site.status === "up";
  const lastCheck = site.lastCheck
    ? `Vérifié <t:${Math.floor(site.lastCheck.getTime() / 1000)}:R>`
    : "Jamais vérifié";

  const statusDuration = site.lastStatusChange
    ? `<t:${Math.floor(site.lastStatusChange.getTime() / 1000)}:R>`
    : "Inconnu";

  console.log(`[Dashboard] Generating embed for ${site.alias} with interval ${site.uptimeInterval}m`);

  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Dashboard: ${site.alias}`)
    .setDescription(`**URL:** ${site.url}\n**Intervalle:** ${site.uptimeInterval}m`)
    .setColor(isUp ? 0x2ecc71 : 0xe74c3c)
    .setTimestamp();

  embed.addFields(
    { name: "Statut", value: `${isUp ? "✅" : site.status === "down" ? "❌" : "⏳"} ${isUp ? "En ligne" : site.status === "down" ? "Hors ligne" : "Non vérifié"}`, inline: true },
    { name: "Depuis le", value: statusDuration, inline: true },
    { name: "Dernière vérification", value: lastCheck, inline: true }
  );

  if (systemInfo) {
    if (systemInfo.cpu) {
      embed.addFields({ name: "🖥️ CPU", value: `${systemInfo.cpu.load}${systemInfo.cpu.unit || "%"}`, inline: true });
    }
    if (systemInfo.ram) {
      embed.addFields({ name: "🧠 RAM", value: `${systemInfo.ram.used}/${systemInfo.ram.total} ${systemInfo.ram.unit || "GB"} (${systemInfo.ram.percent}%)`, inline: true });
    }
    if (systemInfo.disks?.length) {
      const disk = systemInfo.disks.find((d) => d.mount === "/") || systemInfo.disks[0];
      embed.addFields({ name: "💾 Stockage", value: `${disk.used}/${disk.size} (${disk.use_percent})`, inline: true });
    }
    if (systemInfo.uptime) {
      embed.addFields({ name: "⏱️ Uptime", value: systemInfo.uptime.readable || String(systemInfo.uptime.seconds), inline: true });
    }
    if (systemInfo.ssl) {
      const days = systemInfo.ssl.days_remaining || 0;
      const emoji = days > 30 ? "🔒" : days > 7 ? "⚠️" : "🔴";
      embed.addFields({ name: `${emoji} SSL Certificate`, value: `Expire dans: ${days} jours`, inline: false });
    }
  }

  return embed;
}

/**
 * Met à jour le message de Dashboard existant
 */
export async function updateSetupMessage(
  client: Client,
  alias: string,
  statusChanged = false,
  guildId?: string
): Promise<void> {
  let sitesToUpdate: Site[] = [];
  
  if (guildId) {
    const site = await getSite(alias, guildId);
    if (site) sitesToUpdate = [site];
  } else {
    const { loadSites } = await import("./storage");
    const all = await loadSites();
    sitesToUpdate = all.filter((s) => s.alias === alias);
  }

  for (const site of sitesToUpdate) {
    if (!site.setupMessageId || !site.setupChannelId) continue;

    try {
      const channel = await client.channels.fetch(site.setupChannelId);
      if (!channel || !channel.isTextBased()) continue;

      const message = await channel.messages.fetch(site.setupMessageId);
      if (!message) continue;

      if (statusChanged) {
        const isUp = site.status === "up";
        const log = new EmbedBuilder()
          .setTitle(`Statut: ${site.alias}`)
          .setDescription(`**${site.alias}** est désormais **${isUp ? "en ligne" : "hors ligne"}**.\nURL: ${site.url}`)
          .setColor(isUp ? 0x2ecc71 : 0xe74c3c)
          .setTimestamp();

        await sendLogToAllGuilds(client, log);
      }

      const systemInfo = await fetchSystemInfo(site);
      const embed = generateSetupEmbed(site, systemInfo);

      await message.edit({ embeds: [embed] });
    } catch (e) {
      console.error(`[Setup] Update failed for ${alias}:`, e);
    }
  }
}
