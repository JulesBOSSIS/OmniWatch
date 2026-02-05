import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getSite } from "./storage";
import { sendLogToAllGuilds } from "./log-channel";

/**
 * Met à jour le message de configuration d'un site
 * Si guildId est fourni, met à jour seulement ce serveur, sinon tous les serveurs avec cet alias
 * Si le statut a changé, envoie aussi un message dans le channel de logs
 */
export async function updateSetupMessage(
  client: Client,
  alias: string,
  statusChanged = false,
  guildId?: string
): Promise<void> {
  // On charge les sites à mettre à jour
  // Si guildId est fourni, on charge seulement ce site, sinon tous les sites avec cet alias
  let sites: Array<{ alias: string; url: string; guildId: string; uptimeInterval: number; lastCheck?: Date; status?: "up" | "down"; lastStatusChange?: Date; setupMessageId?: string; setupChannelId?: string }> = [];
  
  if (guildId) {
    const site = await getSite(alias, guildId);
    if (site) sites = [site];
  } else {
    // On charge tous les sites avec cet alias depuis tous les serveurs
    const { loadSites } = await import("./storage");
    const allSites = await loadSites();
    sites = allSites.filter(s => s.alias === alias);
  }

  // On met à jour chaque message de setup trouvé
  for (const site of sites) {
    // Si le site n'a pas de message de setup, on passe au suivant
    if (!site.setupMessageId || !site.setupChannelId) {
      continue;
    }

    try {
      // On récupère le channel et le message
      const channel = await client.channels.fetch(site.setupChannelId);
      if (!channel || !channel.isTextBased()) {
        continue; // Le channel n'existe plus ou n'est pas un channel texte
      }

      const message = await channel.messages.fetch(site.setupMessageId);
      if (!message) {
        continue; // Le message n'existe plus
      }

      // Si le statut a changé, on envoie un message dans le channel de logs
      if (statusChanged) {
        const statusEmoji =
          site.status === "up" ? "✅" : site.status === "down" ? "❌" : "⏳";
        const statusText =
          site.status === "up"
            ? "en ligne"
            : site.status === "down"
            ? "hors ligne"
            : "non vérifié";

        const logEmbed = new EmbedBuilder()
          .setTitle(`🔔 Changement de statut - ${site.alias}`)
          .setDescription(
            `Le statut du site **${site.alias}** a changé.\n\n**URL:** ${site.url}\n**Nouveau statut:** ${statusEmoji} ${statusText}`
          )
          .setColor(site.status === "up" ? 0x00ff00 : 0xff0000) // Vert si en ligne, rouge si hors ligne
          .setTimestamp();

        await sendLogToAllGuilds(client, logEmbed);
      }

      // On recrée les boutons avec les intervalles les plus courants
      const intervals = [1, 5, 10, 15, 30, 60, 120, 1440]; // en minutes
      const buttons: ButtonBuilder[] = intervals.map((interval) => {
        const label =
          interval < 60
            ? `${interval} min`
            : interval === 60
            ? "1 heure"
            : interval === 120
            ? "2 heures"
            : "24 heures";
        return new ButtonBuilder()
          .setCustomId(`uptime_${alias}_${interval}`)
          .setLabel(label)
          // Le bouton de l'intervalle actuel est en vert
          .setStyle(
            site.uptimeInterval === interval
              ? ButtonStyle.Success
              : ButtonStyle.Secondary
          );
      });

      // On divise en lignes (max 5 boutons par ligne selon les limites de Discord)
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          buttons.slice(i, i + 5)
        );
        rows.push(row);
      }

      // On récupère l'embed existant ou on en crée un nouveau
      let embed = message.embeds[0] ? EmbedBuilder.from(message.embeds[0]) : new EmbedBuilder();
      
      // Si c'est un nouvel embed, on configure les infos de base
      if (!message.embeds[0]) {
        embed
          .setTitle(`⚙️ Configuration de l'uptime - ${site.alias}`)
          .setDescription(
            `**URL:** ${site.url}\n**Intervalle actuel:** ${site.uptimeInterval} minute(s)\n\nCliquez sur un bouton pour mettre à jour l'intervalle de vérification.`
          )
          .setColor(0x5865f2); // Couleur Discord bleue
      }

      const statusEmoji =
        site.status === "up" ? "✅" : site.status === "down" ? "❌" : "⏳";
      const statusText =
        site.status === "up"
          ? "En ligne"
          : site.status === "down"
          ? "Hors ligne"
          : "Non vérifié";

      // On formate la date de dernière vérification avec le format Discord
      const lastCheck = site.lastCheck
        ? `Dernière vérification: <t:${Math.floor(site.lastCheck.getTime() / 1000)}:R>`
        : "Aucune vérification effectuée";

      // On met à jour seulement les fields qui changent (Statut actuel et Dernière vérification)
      // On garde les autres fields (CPU, RAM, Stockage, etc.)
      const existingFields = embed.data.fields || [];
      
      // On enlève seulement les fields Statut actuel, Dernière vérification et les champs système
      const fieldsToKeep = existingFields.filter(
        (f) =>
          f.name !== "Statut actuel" &&
          f.name !== "Dernière vérification" &&
          !f.name.includes("🖥️ CPU") &&
          !f.name.includes("🧠 RAM") &&
          !f.name.includes("💾 Stockage") &&
          !f.name.includes("⏱️ Uptime") &&
          !f.name.includes("SSL Certificate")
      );
      
      embed.spliceFields(0, embed.data.fields?.length || 0);
      
      // On ajoute d'abord les fields à garder
      fieldsToKeep.forEach(f => {
        embed.addFields({
          name: f.name,
          value: f.value,
          inline: f.inline,
        });
      });
      
      // Ensuite on ajoute les fields qui changent
      embed.addFields(
        {
          name: "Statut actuel",
          value: `${statusEmoji} ${statusText}`,
          inline: true,
        },
        {
          name: "Dernière vérification",
          value: lastCheck,
          inline: true,
        }
      );

      // On récupère les infos du système si disponibles
      let systemInfo = null;
      try {
        const baseUrl = site.testUrl || site.url;
        if (baseUrl) {
          const statusUrl = `${baseUrl}/api/status?secret=${process.env.STATUS_SECRET || "testlpmiaw"}`;
          const response = await fetch(statusUrl);
          if (response.ok) {
            systemInfo = await response.json();
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des infos système:", error);
      }

      // On ajoute les infos du système seulement s'il n'y en a pas déjà
      const hasSystemInfo = existingFields.some(f => 
        ["🖥️ CPU", "🧠 RAM", "💾 Stockage", "⏱️ Uptime"].some(name => f.name.includes(name.split(" ")[0]))
      );
      
      if (systemInfo && !hasSystemInfo) {
        // CPU
        if (systemInfo.cpu) {
          embed.addFields({
            name: "🖥️ CPU",
            value: `${systemInfo.cpu.load}${systemInfo.cpu.unit || "%"}`,
            inline: true,
          });
        }

        // RAM
        if (systemInfo.ram) {
          const ramPercent = systemInfo.ram.percent || "0";
          embed.addFields({
            name: "🧠 RAM",
            value: `${systemInfo.ram.used}/${systemInfo.ram.total} ${systemInfo.ram.unit} (${ramPercent}%)`,
            inline: true,
          });
        }

        // Disks
        if (systemInfo.disks && systemInfo.disks.length > 0) {
          const rootDisk = systemInfo.disks.find((d: any) => d.mount === "/") || systemInfo.disks[0];
          embed.addFields({
            name: "💾 Stockage",
            value: `${rootDisk.used}/${rootDisk.size}\n(${rootDisk.use_percent} utilisé)`,
            inline: true,
          });
        }

        // Uptime
        if (systemInfo.uptime) {
          embed.addFields({
            name: "⏱️ Uptime",
            value: systemInfo.uptime.readable || systemInfo.uptime.seconds,
            inline: true,
          });
        }

        // SSL
        if (systemInfo.ssl) {
          const daysRemaining = systemInfo.ssl.days_remaining || 0;
          const sslEmoji = daysRemaining > 30 ? "🔒" : daysRemaining > 7 ? "⚠️" : "🔴";
          embed.addFields({
            name: `${sslEmoji} SSL Certificate`,
            value: `Issuer: ${systemInfo.ssl.issuer}\nExpire dans: ${daysRemaining} jours`,
            inline: false,
          });
        }
      }

      // On met à jour le message avec l'embed modifié et les nouveaux boutons
      await message.edit({
        embeds: [embed],
        components: rows,
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du message de setup pour ${alias} (serveur: ${site.guildId}):`, error);
    }
  }
}

