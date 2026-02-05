import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { loadSites } from "../services/storage";

export const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("Affiche tous les sites enregistrés");

export async function execute(interaction: ChatInputCommandInteraction) {
  const sites = loadSites();

  if (sites.length === 0) {
    return interaction.reply({
      content: "📋 Aucun site enregistré pour le moment.",
      ephemeral: true,
    });
  }

  const sitesList = sites
    .map((site, index) => {
      const statusEmoji = site.status === "up" ? "✅" : site.status === "down" ? "❌" : "⏳";
      const statusText = site.status === "up" ? "En ligne" : site.status === "down" ? "Hors ligne" : "Non vérifié";
      return `${index + 1}. ${statusEmoji} **${site.alias}**\n   URL: ${site.url}\n   Statut: ${statusText}\n   Intervalle: ${site.uptimeInterval} min`;
    })
    .join("\n\n");

  // Discord limite les messages à 2000 caractères, on peut utiliser un embed ou paginer
  if (sitesList.length > 2000) {
    // Si trop long, envoyer par chunks
    const chunks = sitesList.match(/.{1,1900}[\s\S]*?(?=\n\n|$)/g) || [sitesList];
    await interaction.reply({
      content: `📋 **Sites enregistrés (${sites.length}):**\n\n${chunks[0]}`,
      ephemeral: true,
    });

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

