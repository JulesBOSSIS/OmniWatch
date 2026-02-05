import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getSite, setSetupMessage } from "../services/storage";

/**
 * Commande pour créer un message interactif avec des boutons
 * Permet de changer facilement l'intervalle de vérification d'un site
 */
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
  // On vérifie qu'on est bien dans un serveur (pas en MP)
  if (!interaction.guildId) {
    return interaction.reply({
      content: "❌ Cette commande ne peut être utilisée que dans un serveur.",
      ephemeral: true,
    });
  }

  const alias = interaction.options.getString("alias", true);

  // On récupère le site depuis la base de données
  const site = await getSite(alias, interaction.guildId);

  if (!site) {
    return interaction.reply({
      content: `❌ Aucun site trouvé avec l'alias **${alias}** dans ce serveur.`,
      ephemeral: true,
    });
  }

  // On répond d'abord de manière éphémère pour confirmer
  await interaction.reply({
    content: `✅ Configuration créée pour **${alias}**`,
    ephemeral: true,
  });

  // On crée les boutons pour les intervalles les plus courants (en minutes)
  const intervals = [1, 5, 10, 15, 30, 60, 120, 1440]; // 1440 = 24h
  const buttons: ButtonBuilder[] = intervals.map((interval) => {
    // On formate le label de manière lisible
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
      // Le bouton de l'intervalle actuel est en vert (Success)
      .setStyle(
        site.uptimeInterval === interval
          ? ButtonStyle.Success
          : ButtonStyle.Secondary
      );
  });

  // Discord limite à 5 boutons par ligne, donc on découpe en plusieurs lignes si nécessaire
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      buttons.slice(i, i + 5)
    );
    rows.push(row);
  }

  // On crée un embed joli pour afficher les infos du site
  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Configuration de l'uptime - ${site.alias}`)
    .setDescription(
      `**URL:** ${site.url}\n**Intervalle actuel:** ${site.uptimeInterval} minute(s)\n\nCliquez sur un bouton pour mettre à jour l'intervalle de vérification.`
    )
    .setColor(0x5865f2) // Couleur Discord bleue
    .setTimestamp();

  // On ajoute le statut actuel du site
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

  // On envoie le message dans le channel (pas éphémère, pour que tout le monde puisse le voir)
  const message = await interaction.channel?.send({
    embeds: [embed],
    components: rows,
  });

  // On sauvegarde l'ID du message et du channel pour pouvoir le mettre à jour automatiquement plus tard
  if (message) {
    await setSetupMessage(alias, message.id, message.channel.id, interaction.guildId);
  }
}

