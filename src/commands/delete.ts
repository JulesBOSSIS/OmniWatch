import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { removeSite, getSite } from "../services/storage";

export const data = new SlashCommandBuilder()
  .setName("delete")
  .setDescription("Supprime un site de la surveillance")
  .addStringOption((o) => o.setName("alias").setDescription("Alias du site").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const { guildId } = interaction;
  if (!guildId) return interaction.reply({ content: "❌ Serveur requis.", ephemeral: true });

  const alias = interaction.options.getString("alias", true);
  
  // On récupère les infos avant la suppression pour avoir l'ID du message
  const site = await getSite(alias, guildId);
  if (!site) {
    return interaction.reply({ content: `❌ Alias **${alias}** introuvable.`, ephemeral: true });
  }

  // Suppression DB
  const deleted = await removeSite(alias, guildId);

  if (deleted) {
    // Tentative de suppression du message de Dashboard si il existe
    if (site.setupChannelId && site.setupMessageId) {
      try {
        const channel = await interaction.client.channels.fetch(site.setupChannelId);
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(site.setupMessageId);
          if (message) await message.delete();
        }
      } catch (e) {
        console.error(`[Delete] Failed to delete dashboard message for ${alias}:`, e);
      }
    }

    return interaction.reply({ content: `✅ Site **${alias}** supprimé.`, ephemeral: true });
  }

  return interaction.reply({ content: "❌ Erreur lors de la suppression.", ephemeral: true });
}