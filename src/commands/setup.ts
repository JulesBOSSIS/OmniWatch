import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getSite, setSetupMessage } from "../services/storage";
import { generateSetupEmbed } from "../services/setup-message";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Affiche le tableau de bord d'un site")
  .addStringOption((o) => o.setName("alias").setDescription("Alias du site").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const { guildId } = interaction;
  if (!guildId) return interaction.reply({ content: "❌ Serveur requis.", ephemeral: true });

  const alias = interaction.options.getString("alias", true);
  const site = await getSite(alias, guildId);

  if (!site) {
    return interaction.reply({ content: `❌ Alias **${alias}** introuvable.`, ephemeral: true });
  }

  // On répond pour confirmer l'action
  await interaction.reply({ content: `✅ Dashboard créé pour **${alias}**`, ephemeral: true });

  // On récupère les infos une première fois
  let systemInfo = null;
  try {
    if (site.testUrl) {
      const urlObj = new URL(site.testUrl);
      if (site.secret) urlObj.searchParams.set("secret", site.secret);
      const res = await fetch(urlObj.toString());
      if (res.ok) systemInfo = await res.json();
    }
  } catch (e) {
    console.error(`[Setup] Initial fetch failed for ${alias}:`, e);
  }

  // On utilise la fonction centralisée pour l'Embed
  const embed = generateSetupEmbed(site, systemInfo);

  const message = await interaction.channel?.send({ embeds: [embed] });
  if (message) {
    await setSetupMessage(alias, message.id, message.channel.id, guildId);
  }
}
