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

      // On crée l'embed mis à jour avec les nouvelles infos
      const embed = new EmbedBuilder()
        .setTitle(`⚙️ Configuration de l'uptime - ${site.alias}`)
        .setDescription(
          `**URL:** ${site.url}\n**Intervalle actuel:** ${site.uptimeInterval} minute(s)\n\nCliquez sur un bouton pour mettre à jour l'intervalle de vérification.`
        )
        .setColor(0x5865f2) // Couleur Discord bleue
        .setTimestamp();

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

      // On met à jour le message avec le nouvel embed et les nouveaux boutons
      await message.edit({
        embeds: [embed],
        components: rows,
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du message de setup pour ${alias} (serveur: ${site.guildId}):`, error);
    }
  }
}

