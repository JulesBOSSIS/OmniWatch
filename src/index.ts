import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { startMonitoring } from "./services/monitor";
import { updateSiteUptime, getSite } from "./services/storage";
import { updateSetupMessage } from "./services/setup-message";

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
  // Gérer les commandes slash
  if (interaction.isChatInputCommand()) {
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
    return;
  }

  // Gérer les interactions de boutons pour l'uptime
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith("uptime_")) {
      const parts = customId.split("_");
      if (parts.length === 3) {
        const alias = parts[1];
        const uptimeInterval = parseInt(parts[2], 10);

        const site = getSite(alias);

        if (!site) {
          return interaction.reply({
            content: `❌ Site **${alias}** introuvable.`,
            ephemeral: true,
          });
        }

        const updated = updateSiteUptime(alias, uptimeInterval);

        if (updated) {
          // Mettre à jour les boutons pour refléter le nouveau statut
          const intervals = [1, 5, 10, 15, 30, 60, 120, 1440];

          const buttons: ButtonBuilder[] = intervals.map((interval) => {
            const label =
              interval < 60
                ? `${interval} min`
                : interval === 60
                  ? "1 heure"
                  : interval === 120
                    ? "2 heures"
                    : "24 heures";
            return new ButtonBuilder()
              .setCustomId(`uptime_${alias}_${interval}`)
              .setLabel(label)
              .setStyle(
                uptimeInterval === interval
                  ? ButtonStyle.Success
                  : ButtonStyle.Secondary
              );
          });

          const rows: ActionRowBuilder<ButtonBuilder>[] = [];
          for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              buttons.slice(i, i + 5)
            );
            rows.push(row);
          }

          const updatedSite = getSite(alias);
          if (!updatedSite) {
            return interaction.reply({
              content: "❌ Erreur lors de la récupération du site.",
              ephemeral: true,
            });
          }

          const embed = new EmbedBuilder()
            .setTitle(`⚙️ Configuration de l'uptime - ${updatedSite.alias}`)
            .setDescription(
              `**URL:** ${updatedSite.url}\n**Intervalle actuel:** ${uptimeInterval} minute(s)\n\nCliquez sur un bouton pour mettre à jour l'intervalle de vérification.`
            )
            .setColor(0x5865f2)
            .setTimestamp();

          const statusEmoji =
            updatedSite.status === "up"
              ? "✅"
              : updatedSite.status === "down"
                ? "❌"
                : "⏳";
          const statusText =
            updatedSite.status === "up"
              ? "En ligne"
              : updatedSite.status === "down"
                ? "Hors ligne"
                : "Non vérifié";

          embed.addFields({
            name: "Statut actuel",
            value: `${statusEmoji} ${statusText}`,
            inline: true,
          });

          await interaction.update({
            embeds: [embed],
            components: rows,
          });

          // Mettre à jour le message de setup pour refléter les changements
          await updateSetupMessage(client, alias);

          await interaction.followUp({
            content: `✅ Intervalle de vérification mis à jour à **${uptimeInterval} minute(s)** pour **${alias}**.`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "❌ Erreur lors de la mise à jour de l'intervalle.",
            ephemeral: true,
          });
        }
      }
    }
  }
});

client.login(config.DISCORD_TOKEN);
