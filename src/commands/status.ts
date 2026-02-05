import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getSite } from "../services/storage";
import { checkSite } from "../services/monitor";

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
  const alias = interaction.options.getString("alias", true);

  const site = getSite(alias);

  if (!site) {
    return interaction.reply({
      content: `❌ Aucun site trouvé avec l'alias **${alias}**.`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  // Vérifier le statut en temps réel
  const status = await checkSite(site);
  const statusEmoji = status === "up" ? "✅" : "❌";
  const statusText = status === "up" ? "En ligne" : "Hors ligne";

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

