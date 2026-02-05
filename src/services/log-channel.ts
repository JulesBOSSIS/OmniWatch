import { Client, TextChannel, Guild, ChannelType, PermissionFlagsBits, EmbedBuilder } from "discord.js";

// Nom du channel de logs créé automatiquement dans chaque serveur
const LOG_CHANNEL_NAME = "site-monitor-logs";

/**
 * Récupère ou crée le channel de logs pour un serveur
 * Si le channel n'existe pas, on le crée avec les bonnes permissions
 * (seul le bot peut envoyer des messages dedans)
 */
async function getOrCreateLogChannel(
  client: Client,
  guild: Guild
): Promise<TextChannel | null> {
  try {
    // On cherche d'abord si le channel existe déjà
    let logChannel = guild.channels.cache.find(
      (channel) =>
        channel.isTextBased() &&
        channel.name === LOG_CHANNEL_NAME &&
        channel instanceof TextChannel
    ) as TextChannel | undefined;

    // Si le channel n'existe pas, on le crée
    if (!logChannel) {
      // On vérifie que le bot a les permissions pour créer des channels
      if (!client.user) return null;
      const botMember = await guild.members.fetch(client.user.id);
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        console.warn(
          `Le bot n'a pas la permission de créer des channels dans le serveur ${guild.id}`
        );
        return null;
      }

      // On crée le channel avec les bonnes permissions
      logChannel = await guild.channels.create({
        name: LOG_CHANNEL_NAME,
        type: ChannelType.GuildText,
        topic: "Channel de logs pour le monitoring des sites web",
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.SendMessages], // Seul le bot peut envoyer des messages
          },
        ],
      });

      console.log(`Channel de logs créé: ${LOG_CHANNEL_NAME} dans le serveur ${guild.name}`);
    }

    return logChannel;
  } catch (error) {
    console.error(`Erreur lors de la récupération/création du channel de logs dans le serveur ${guild.id}:`, error);
    return null;
  }
}

/**
 * Envoie un embed de log dans tous les serveurs où le bot est présent
 * Utile pour notifier les changements de statut des sites
 */
export async function sendLogToAllGuilds(
  client: Client,
  embed: EmbedBuilder
): Promise<void> {
  try {
    const guilds = await client.guilds.fetch();
    // On parcourt tous les serveurs
    for (const guild of guilds.values()) {
      const fullGuild = await guild.fetch();
      const logChannel = await getOrCreateLogChannel(client, fullGuild);
      if (logChannel) {
        try {
          await logChannel.send({ embeds: [embed] });
        } catch (error) {
          console.error(
            `Erreur lors de l'envoi du message de log dans le serveur ${fullGuild.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi des logs dans tous les serveurs:", error);
  }
}

