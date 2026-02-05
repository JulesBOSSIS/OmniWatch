import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from "discord.js";
import { getSite } from "../services/storage";

export const data = new SlashCommandBuilder()
  .setName("edit")
  .setDescription("Ouvre une fenêtre pour modifier un site")
  .addStringOption((o) => o.setName("alias").setDescription("Alias du site à modifier").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const { guildId } = interaction;
  if (!guildId) return interaction.reply({ content: "❌ Serveur requis.", ephemeral: true });

  const alias = interaction.options.getString("alias", true);
  const site = await getSite(alias, guildId);

  if (!site) {
    return interaction.reply({ content: `❌ Alias **${alias}** introuvable.`, ephemeral: true });
  }

  // Création du Modal
  const modal = new ModalBuilder()
    .setCustomId(`edit_modal_${alias}`)
    .setTitle(`Modifier ${alias}`);

  // Champ Nouvel Alias
  const aliasInput = new TextInputBuilder()
    .setCustomId("new_alias")
    .setLabel("Nouvel Alias")
    .setStyle(TextInputStyle.Short)
    .setValue(site.alias)
    .setRequired(true);

  // Champ URL de Test
  const testUrlInput = new TextInputBuilder()
    .setCustomId("test_url")
    .setLabel("URL de monitoring (testUrl)")
    .setStyle(TextInputStyle.Short)
    .setValue(site.testUrl ?? "")
    .setRequired(false);

  // Champ Uptime
  const uptimeInput = new TextInputBuilder()
    .setCustomId("uptime")
    .setLabel("Intervalle (minutes)")
    .setStyle(TextInputStyle.Short)
    .setValue(site.uptimeInterval.toString())
    .setRequired(true);

  // Champ Secret
  const secretInput = new TextInputBuilder()
    .setCustomId("secret")
    .setLabel("API Secret (laisser vide pour aucun)")
    .setStyle(TextInputStyle.Short)
    .setValue(site.secret ?? "")
    .setRequired(false);

  // Ajout des champs au modal (un par ligne)
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(aliasInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(testUrlInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(uptimeInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(secretInput)
  );

  await interaction.showModal(modal);
}