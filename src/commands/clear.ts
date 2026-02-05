import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType } from "discord.js";

/**
 * Commande pour effacer les messages du bot
 * Par défaut: efface les 10 derniers messages du bot
 * Avec --all: efface tous les messages du bot
 */
export const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Efface les messages du bot")
  .addStringOption((option) =>
    option
      .setName("scope")
      .setDescription("Portée du nettoyage")
      .addChoices(
        { name: "Derniers 10 messages", value: "last10" },
        { name: "Tous les messages", value: "all" }
      )
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // On vérifie qu'on est bien dans un serveur (pas en MP)
  if (!interaction.guildId || !interaction.channel) {
    return interaction.reply({
      content: "❌ Cette commande ne peut être utilisée que dans un serveur.",
      ephemeral: true,
    });
  }

  // On vérifie que c'est un channel textuel
  if (interaction.channel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: "❌ Cette commande ne peut être utilisée que dans un canal textuel.",
      ephemeral: true,
    });
  }

  const scope = interaction.options.getString("scope") || "last10";

  try {
    // On affiche un message de chargement
    await interaction.deferReply({ ephemeral: true });

    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      // On récupère les messages (max 100 par requête)
      const messages = await interaction.channel.messages.fetch({ limit: 100 });

      // On filtre les messages du bot
      const botMessages = messages.filter((msg) => msg.author.id === interaction.client.user?.id);

      if (botMessages.size === 0) {
        hasMore = false;
        break;
      }

      // On limite à 10 si scope est "last10"
      const messagesToDelete = scope === "last10" 
        ? botMessages.first(10) 
        : botMessages;

      if (!messagesToDelete || messagesToDelete.length === 0) {
        hasMore = false;
        break;
      }

      // On supprime les messages
      for (const msg of messagesToDelete) {
        try {
          await msg.delete();
          deletedCount++;
        } catch (error) {
          console.error("Erreur lors de la suppression du message:", error);
        }
      }

      // Si scope est "last10", on arrête après avoir supprimé 10 messages
      if (scope === "last10") {
        hasMore = false;
      }
    }

    return interaction.editReply({
      content: `✅ ${deletedCount} message(s) du bot supprimé(s)!`,
    });
  } catch (error) {
    console.error("Erreur lors du nettoyage:", error);
    return interaction.editReply({
      content: "❌ Une erreur est survenue lors du nettoyage.",
    });
  }
}
