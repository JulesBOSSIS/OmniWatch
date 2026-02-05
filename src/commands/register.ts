import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { addSite } from "../services/storage";

/**
 * Commande pour enregistrer un nouveau site à surveiller
 * Le bot va vérifier régulièrement si le site est en ligne ou pas
 */
export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Enregistre un site web à surveiller")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("URL du site à surveiller (ex: https://example.com)")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("alias")
      .setDescription("Alias pour identifier le site")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("uptime")
      .setDescription("Intervalle de vérification en minutes (défaut: 5)")
      .setMinValue(1)
      .setMaxValue(1440) // Max 24h
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // On vérifie qu'on est bien dans un serveur (pas en MP)
  if (!interaction.guildId) {
    return interaction.reply({
      content: "❌ Cette commande ne peut être utilisée que dans un serveur.",
      ephemeral: true,
    });
  }

  const url = interaction.options.getString("url", true);
  const alias = interaction.options.getString("alias", true);
  const uptimeInterval = interaction.options.getInteger("uptime") ?? 5;

  // On vérifie que l'URL est valide avant de l'enregistrer
  try {
    new URL(url);
  } catch {
    return interaction.reply({
      content: "❌ URL invalide. Veuillez fournir une URL valide (ex: https://example.com)",
      ephemeral: true,
    });
  }

  try {
    // On sauvegarde le site dans la base de données
    await addSite({
      alias,
      url,
      guildId: interaction.guildId,
      uptimeInterval,
    });

    return interaction.reply({
      content: `✅ Site **${alias}** (${url}) enregistré avec succès!\nIntervalle de vérification: ${uptimeInterval} minute(s)`,
      ephemeral: true,
    });
  } catch (error) {
    // Si l'alias existe déjà, on affiche un message d'erreur clair
    if (error instanceof Error) {
      return interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        ephemeral: true,
      });
    }
    return interaction.reply({
      content: "❌ Une erreur s'est produite lors de l'enregistrement du site.",
      ephemeral: true,
    });
  }
}

