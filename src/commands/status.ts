import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getSite } from "../services/storage";
import { checkSite } from "../services/monitor";

/**
 * Commande pour vérifier le statut d'un site en temps réel
 * Fait une vérification immédiate (pas besoin d'attendre l'intervalle)
 */
export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Affiche le statut d'un site")
  .addStringOption((option) =>
    option
      .setName("alias")
      .setDescription("Alias du site à vérifier")
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

  // On diffère la réponse car la vérification peut prendre un peu de temps
  await interaction.deferReply({ ephemeral: true });

  // On fait une vérification en temps réel (pas besoin d'attendre l'intervalle)
  const status = await checkSite(site);
  const statusEmoji = status === "up" ? "✅" : "❌";
  const statusText = status === "up" ? "En ligne" : "Hors ligne";

  // On formate les dates avec le format Discord (timestamp relatif)
  const lastCheck = site.lastCheck
    ? `Dernière vérification: <t:${Math.floor(site.lastCheck.getTime() / 1000)}:R>`
    : "Aucune vérification effectuée";

  const lastStatusChange = site.lastStatusChange
    ? `Dernier changement: <t:${Math.floor(site.lastStatusChange.getTime() / 1000)}:R>`
    : "";

  return interaction.editReply({
    content: `${statusEmoji} **${site.alias}**\nURL: ${site.url}\nStatut: ${statusText}\nIntervalle: ${site.uptimeInterval} minute(s)\n${lastCheck}${lastStatusChange ? `\n${lastStatusChange}` : ""}`,
  });
}

