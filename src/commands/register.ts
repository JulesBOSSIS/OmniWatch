import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { addSite } from "../services/storage";

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Enregistre un site web à surveiller")
  .addStringOption((o) => o.setName("url").setDescription("URL du site").setRequired(true))
  .addStringOption((o) => o.setName("alias").setDescription("Alias unique").setRequired(true))
  .addStringOption((o) => o.setName("test_url").setDescription("URL de monitoring (optionnel)"))
  .addStringOption((o) => o.setName("secret").setDescription("Secret pour l'API de monitoring"))
  .addIntegerOption((o) => o.setName("uptime").setDescription("Intervalle (min)").setMinValue(1).setMaxValue(1440));

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const { guildId } = interaction;
  if (!guildId) {
    return interaction.reply({ content: "❌ Serveur requis.", ephemeral: true });
  }

  let url = interaction.options.getString("url", true);
  let testUrl = interaction.options.getString("test_url");
  const alias = interaction.options.getString("alias", true);
  const secret = interaction.options.getString("secret");
  const uptimeInterval = interaction.options.getInteger("uptime") ?? 5;

  // Normalisation des URLs
  url = normalizeUrl(url);
  if (testUrl) testUrl = normalizeUrl(testUrl);

  try {
    new URL(url);
    if (testUrl) new URL(testUrl);
  } catch {
    return interaction.reply({ content: "❌ URL invalide.", ephemeral: true });
  }

  try {
    await addSite({ 
      alias, 
      url, 
      testUrl: testUrl ?? undefined, 
      secret: secret ?? undefined, 
      guildId, 
      uptimeInterval 
    });
    
    return interaction.reply({
      content: `✅ Site **${alias}** enregistré !\n**URL:** ${url}${testUrl ? `\n**Test:** ${testUrl}` : ""}\n**Check:** ${uptimeInterval}m`,
      ephemeral: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return interaction.reply({ content: `❌ ${msg}`, ephemeral: true });
  }
}