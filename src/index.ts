import { Client } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { startMonitoring } from "./services/monitor";
import { updateSiteInfo } from "./services/storage";
import { updateSetupMessage } from "./services/setup-message";

export const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

client.once("ready", async () => {
  console.log(`[OmniWatch] Logged in as ${client.user?.tag}`);

  const guilds = await client.guilds.fetch();
  for (const guild of guilds.values()) {
    await deployCommands({ guildId: guild.id });
  }

  startMonitoring(client, 1);
  console.log("[Monitor] Service started");
});

client.on("guildCreate", (guild) => deployCommands({ guildId: guild.id }));

client.on("interactionCreate", async (interaction) => {
  // Commandes Slash
  if (interaction.isChatInputCommand()) {
    const command = commands[interaction.commandName as keyof typeof commands];
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[Cmd] ${interaction.commandName} failed:`, error);
      const reply = { content: "Une erreur est survenue.", ephemeral: true };
      interaction.replied || interaction.deferred ? await interaction.followUp(reply) : await interaction.reply(reply);
    }
    return;
  }

  // Soumission de Modal
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("edit_modal_")) {
      const originalAlias = interaction.customId.replace("edit_modal_", "");
      const { guildId } = interaction;
      if (!guildId) return;

      const newAlias = interaction.fields.getTextInputValue("new_alias");
      let testUrl = interaction.fields.getTextInputValue("test_url");
      const secret = interaction.fields.getTextInputValue("secret");
      const uptimeStr = interaction.fields.getTextInputValue("uptime");
      const uptime = parseInt(uptimeStr, 10);

      if (isNaN(uptime) || uptime < 1) {
        return interaction.reply({ content: "❌ L'intervalle doit être un nombre positif.", ephemeral: true });
      }

      // Normalisation de l'URL
      testUrl = normalizeUrl(testUrl);

      try {
        new URL(testUrl);
      } catch {
        return interaction.reply({ content: "❌ URL de monitoring invalide.", ephemeral: true });
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        const success = await updateSiteInfo(originalAlias, guildId, {
          newAlias: newAlias !== originalAlias ? newAlias : undefined,
          testUrl,
          uptimeInterval: uptime,
          secret: secret || ""
        });

        if (!success) {
          return interaction.editReply({ content: "❌ Impossible de modifier le site." });
        }

        // On utilise explicitement la nouvelle valeur de l'alias
        await updateSetupMessage(client, newAlias, false, guildId);

        await interaction.editReply({
          content: `✅ **${newAlias}** mis à jour ! ${newAlias !== originalAlias ? `(Ancien nom: **${originalAlias}**)` : ""}`
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erreur interne";
        await interaction.editReply({ content: `❌ ${msg}` });
      }
    }
  }
});

client.login(config.DISCORD_TOKEN);
