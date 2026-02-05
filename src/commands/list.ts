import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { loadSites } from "../services/storage";

/**
 * Commande pour lister tous les sites surveillés dans le serveur
 * Affiche le statut actuel de chaque site (en ligne, hors ligne, non vérifié)
 */
export const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("Affiche tous les sites enregistrés");

export async function execute(interaction: ChatInputCommandInteraction) {
  // On vérifie qu'on est bien dans un serveur (pas en MP)
  if (!interaction.guildId) {
    return interaction.reply({
      content: "❌ Cette commande ne peut être utilisée que dans un serveur.",
      ephemeral: true,
    });
  }

  // On récupère tous les sites du serveur
  const sites = await loadSites(interaction.guildId);

  if (sites.length === 0) {
    return interaction.reply({
      content: "📋 Aucun site enregistré pour le moment dans ce serveur.",
      ephemeral: true,
    });
  }

  // On formate la liste des sites avec leur statut
  const sitesList = sites
    .map((site, index) => {
      const statusEmoji = site.status === "up" ? "✅" : site.status === "down" ? "❌" : "⏳";
      const statusText = site.status === "up" ? "En ligne" : site.status === "down" ? "Hors ligne" : "Non vérifié";
      return `${index + 1}. ${statusEmoji} **${site.alias}**\n   URL: ${site.url}\n   Statut: ${statusText}\n   Intervalle: ${site.uptimeInterval} min`;
    })
    .join("\n\n");

  // Discord limite les messages à 2000 caractères, donc si on dépasse, on découpe en plusieurs messages
  if (sitesList.length > 2000) {
    // On découpe le message en plusieurs morceaux pour éviter de dépasser la limite
    const chunks = sitesList.match(/.{1,1900}[\s\S]*?(?=\n\n|$)/g) || [sitesList];
    await interaction.reply({
      content: `📋 **Sites enregistrés (${sites.length}):**\n\n${chunks[0]}`,
      ephemeral: true,
    });

    // On envoie les morceaux restants
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks[i],
        ephemeral: true,
      });
    }
  } else {
    return interaction.reply({
      content: `📋 **Sites enregistrés (${sites.length}):**\n\n${sitesList}`,
      ephemeral: true,
    });
  }
}

