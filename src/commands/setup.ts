import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getSite, setSetupMessage } from "../services/storage";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure l'uptime d'un site avec des boutons interactifs")
  .addStringOption((option) =>
    option
      .setName("alias")
      .setDescription("Alias du site à configurer")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const alias = interaction.options.getString("alias", true);

  const site = getSite(alias);

  if (!site) {
    return interaction.reply({
      content: `❌ Aucun site trouvé avec l'alias **${alias}**.`,
      ephemeral: true,
    });
  }

  // Répondre d'abord de manière éphémère
  await interaction.reply({
    content: `✅ Configuration créée pour **${alias}**`,
    ephemeral: true,
  });

  // Créer les boutons pour les intervalles courants
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
      .setStyle(
        site.uptimeInterval === interval
          ? ButtonStyle.Success
          : ButtonStyle.Secondary
      );
  });

  // Diviser en deux lignes si nécessaire (max 5 boutons par ligne)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      buttons.slice(i, i + 5)
    );
    rows.push(row);
  }

  // Créer un embed pour le message
  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Configuration de l'uptime - ${site.alias}`)
    .setDescription(
      `**URL:** ${site.url}\n**Intervalle actuel:** ${site.uptimeInterval} minute(s)\n\nCliquez sur un bouton pour mettre à jour l'intervalle de vérification.`
    )
    .setColor(0x5865f2)
    .setTimestamp();

  const statusEmoji = site.status === "up" ? "✅" : site.status === "down" ? "❌" : "⏳";
  const statusText =
    site.status === "up"
      ? "En ligne"
      : site.status === "down"
      ? "Hors ligne"
      : "Non vérifié";

  embed.addFields({
    name: "Statut actuel",
    value: `${statusEmoji} ${statusText}`,
    inline: true,
  });

  // Envoyer le message dans le channel (pas éphémère)
  const message = await interaction.channel?.send({
    embeds: [embed],
    components: rows,
  });

  // Sauvegarder l'ID du message et du channel pour les mises à jour automatiques
  if (message) {
    setSetupMessage(alias, message.id, message.channel.id);
  }
}

