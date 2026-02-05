import { Client } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { startMonitoring } from "./services/monitor";

export const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

client.once("ready", async () => {
  console.log("Discord bot is ready! 🤖");

  // Déployer les commandes pour tous les serveurs où le bot est présent
  const guilds = await client.guilds.fetch();
  for (const guild of guilds.values()) {
    await deployCommands({ guildId: guild.id });
  }

  // Démarrer le monitoring des sites
  console.log("Starting website monitoring...");
  startMonitoring(client, 1); // Vérifier toutes les minutes
});

client.on("guildCreate", async (guild) => {
  await deployCommands({ guildId: guild.id });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  const { commandName } = interaction;
  const command = commands[commandName as keyof typeof commands];
  if (command) {
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "Une erreur s'est produite lors de l'exécution de cette commande.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Une erreur s'est produite lors de l'exécution de cette commande.",
          ephemeral: true,
        });
      }
    }
  }
});

client.login(config.DISCORD_TOKEN);
