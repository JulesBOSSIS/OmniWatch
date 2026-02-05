import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getSite } from "./storage";
import { sendLogToAllGuilds } from "./log-channel";

export async function updateSetupMessage(
  client: Client,
  alias: string,
  statusChanged = false
): Promise<void> {
  // Recharger le site pour avoir les dernières données (statut, uptime, etc.)
  const site = getSite(alias);
  if (!site || !site.setupMessageId || !site.setupChannelId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(site.setupChannelId);
    if (!channel || !channel.isTextBased()) {
      return;
    }

    const message = await channel.messages.fetch(site.setupMessageId);
    if (!message) {
      return;
    }

    // Si le statut a changé, envoyer un message dans le channel de log
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
        .setColor(site.status === "up" ? 0x00ff00 : 0xff0000)
        .setTimestamp();

      await sendLogToAllGuilds(client, logEmbed);
    }

    // Créer les boutons pour les intervalles courants
    const intervals = [1, 5, 10, 15, 30, 60, 120, 1440];
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
        .setStyle(
          site.uptimeInterval === interval
            ? ButtonStyle.Success
            : ButtonStyle.Secondary
        );
    });

    // Diviser en lignes (max 5 boutons par ligne)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttons.slice(i, i + 5)
      );
      rows.push(row);
    }

    // Créer l'embed mis à jour
    const embed = new EmbedBuilder()
      .setTitle(`⚙️ Configuration de l'uptime - ${site.alias}`)
      .setDescription(
        `**URL:** ${site.url}\n**Intervalle actuel:** ${site.uptimeInterval} minute(s)\n\nCliquez sur un bouton pour mettre à jour l'intervalle de vérification.`
      )
      .setColor(0x5865f2)
      .setTimestamp();

    const statusEmoji =
      site.status === "up" ? "✅" : site.status === "down" ? "❌" : "⏳";
    const statusText =
      site.status === "up"
        ? "En ligne"
        : site.status === "down"
        ? "Hors ligne"
        : "Non vérifié";

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

    await message.edit({
      embeds: [embed],
      components: rows,
    });
  } catch (error) {
    console.error(`Error updating setup message for ${alias}:`, error);
  }
}

