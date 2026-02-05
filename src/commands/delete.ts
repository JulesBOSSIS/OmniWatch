import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { removeSite } from "../services/storage";

/**
 * Commande pour supprimer un site de la surveillance
 * Le bot arrêtera de vérifier ce site après la suppression
 */
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
  // On vérifie qu'on est bien dans un serveur (pas en MP)
  if (!interaction.guildId) {
    return interaction.reply({
      content: "❌ Cette commande ne peut être utilisée que dans un serveur.",
      ephemeral: true,
    });
  }

  const alias = interaction.options.getString("alias", true);

  // On supprime le site de la base de données
  const deleted = await removeSite(alias, interaction.guildId);

  if (deleted) {
    return interaction.reply({
      content: `✅ Site **${alias}** supprimé avec succès!`,
      ephemeral: true,
    });
  } else {
    return interaction.reply({
      content: `❌ Aucun site trouvé avec l'alias **${alias}** dans ce serveur.`,
      ephemeral: true,
    });
  }
}

