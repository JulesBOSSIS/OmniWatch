import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Ouvre un formulaire pour enregistrer un nouveau site");

export async function execute(interaction: ChatInputCommandInteraction) {
  const { guildId } = interaction;
  if (!guildId) return interaction.reply({ content: "❌ Serveur requis.", ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId("register_modal")
    .setTitle("Enregistrer un nouveau site");

  const aliasInput = new TextInputBuilder()
    .setCustomId("alias")
    .setLabel("Alias unique")
    .setPlaceholder("ex: vps03")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const urlInput = new TextInputBuilder()
    .setCustomId("url")
    .setLabel("URL du site")
    .setPlaceholder("ex: google.fr")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const testUrlInput = new TextInputBuilder()
    .setCustomId("test_url")
    .setLabel("URL de monitoring (Optionnel)")
    .setPlaceholder("ex: monitoring.vps03.lpmiaw-lr.fr/api/status")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const secretInput = new TextInputBuilder()
    .setCustomId("secret")
    .setLabel("API Secret (Optionnel)")
    .setPlaceholder("Le secret pour l'API de status")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const uptimeInput = new TextInputBuilder()
    .setCustomId("uptime")
    .setLabel("Intervalle en minutes (Optionnel)")
    .setPlaceholder("Défaut: 5")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(aliasInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(urlInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(testUrlInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(secretInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(uptimeInput)
  );

  await interaction.showModal(modal);
}
