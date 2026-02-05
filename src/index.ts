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

// On importe la connexion à la base de données pour s'assurer qu'elle est initialisée
import { db } from './db';

/**
 * Client Discord principal
 * Configure les intents nécessaires pour que le bot fonctionne
 */
export const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

/**
 * Événement déclenché quand le bot est prêt et connecté à Discord
 */
client.once("ready", async () => {
  console.log("Discord bot is ready! 🤖");

  // On déploie les commandes slash pour tous les serveurs où le bot est présent
  const guilds = await client.guilds.fetch();
  for (const guild of guilds.values()) {
    await deployCommands({ guildId: guild.id });
  }

  // On démarre le monitoring des sites
  // Le bot vérifiera toutes les minutes si des sites doivent être vérifiés
  console.log("Starting website monitoring...");
  startMonitoring(client, 1); // Vérifier toutes les minutes
});

/**
 * Événement déclenché quand le bot rejoint un nouveau serveur
 * On déploie les commandes pour ce serveur
 */
client.on("guildCreate", async (guild) => {
  await deployCommands({ guildId: guild.id });
});

/**
 * Événement déclenché quand une interaction est créée (commande slash ou bouton)
 */
client.on("interactionCreate", async (interaction) => {
  // Gestion des commandes slash (ex: /ping, /register, etc.)
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    const command = commands[commandName as keyof typeof commands];
    if (command) {
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
        // On affiche un message d'erreur à l'utilisateur
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

  // Gestion des interactions de boutons (pour changer l'intervalle de vérification)
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // On vérifie si c'est un bouton pour changer l'uptime (format: uptime_<alias>_<interval>)
    if (customId.startsWith("uptime_")) {
      if (!interaction.guildId) {
        return interaction.reply({
          content: "❌ Cette interaction ne peut être utilisée que dans un serveur.",
          ephemeral: true,
        });
      }

      // On parse le customId pour récupérer l'alias et l'intervalle
      const parts = customId.split("_");
      if (parts.length === 3) {
        const alias = parts[1];
        const uptimeInterval = parseInt(parts[2], 10);

        // On vérifie que le site existe
        const site = await getSite(alias, interaction.guildId);

        if (!site) {
          return interaction.reply({
            content: `❌ Site **${alias}** introuvable dans ce serveur.`,
            ephemeral: true,
          });
        }

        // On met à jour l'intervalle dans la base de données
        const updated = await updateSiteUptime(alias, uptimeInterval, interaction.guildId);

        if (updated) {
          // On recrée les boutons avec le nouvel intervalle sélectionné en vert
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
                  ? ButtonStyle.Success // Le bouton de l'intervalle actuel est en vert
                  : ButtonStyle.Secondary
              );
          });

          // On divise en lignes (max 5 boutons par ligne)
          const rows: ActionRowBuilder<ButtonBuilder>[] = [];
          for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              buttons.slice(i, i + 5)
            );
            rows.push(row);
          }

          // On récupère le site mis à jour pour afficher les bonnes infos
          const updatedSite = await getSite(alias, interaction.guildId);
          if (!updatedSite) {
            return interaction.reply({
              content: "❌ Erreur lors de la récupération du site.",
              ephemeral: true,
            });
          }

          // On crée l'embed mis à jour
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

          // On met à jour le message avec le nouvel embed et les nouveaux boutons
          await interaction.update({
            embeds: [embed],
            components: rows,
          });

          // On met à jour aussi le message de setup pour refléter les changements
          await updateSetupMessage(client, alias, false, interaction.guildId);

          // On confirme à l'utilisateur que la mise à jour a réussi
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

// On connecte le bot à Discord avec le token
client.login(config.DISCORD_TOKEN);
