import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { removeSite } from "../services/storage";

export const data = new SlashCommandBuilder()
  .setName("delete")
  .setDescription("Supprime un site de la surveillance")
  .addStringOption((option) =>
    option
      .setName("alias")
      .setDescription("Alias du site à supprimer")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const alias = interaction.options.getString("alias", true);

  const deleted = removeSite(alias);

  if (deleted) {
    return interaction.reply({
      content: `✅ Site **${alias}** supprimé avec succès!`,
      ephemeral: true,
    });
  } else {
    return interaction.reply({
      content: `❌ Aucun site trouvé avec l'alias **${alias}**.`,
      ephemeral: true,
    });
  }
}

