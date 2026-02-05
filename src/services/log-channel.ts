import { Client, TextChannel, Guild, ChannelType, PermissionFlagsBits } from "discord.js";

const LOG_CHANNEL_NAME = "site-monitor-logs";

export async function getOrCreateLogChannel(
  client: Client,
  guild: Guild
): Promise<TextChannel | null> {
  try {
    // Chercher un channel existant avec le nom de log
    let logChannel = guild.channels.cache.find(
      (channel) =>
        channel.isTextBased() &&
        channel.name === LOG_CHANNEL_NAME &&
        channel instanceof TextChannel
    ) as TextChannel | undefined;

    // Si le channel n'existe pas, le créer
    if (!logChannel) {
      // Vérifier que le bot a les permissions nécessaires
      const botMember = await guild.members.fetch(client.user!.id);
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        console.warn(
          `Bot doesn't have permission to create channels in guild ${guild.id}`
        );
        return null;
      }

      logChannel = await guild.channels.create({
        name: LOG_CHANNEL_NAME,
        type: ChannelType.GuildText,
        topic: "Channel de logs pour le monitoring des sites web",
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.SendMessages], // Personne ne peut envoyer de messages sauf le bot
          },
        ],
      });

      console.log(`Created log channel ${LOG_CHANNEL_NAME} in guild ${guild.name}`);
    }

    return logChannel;
  } catch (error) {
    console.error(`Error getting/creating log channel in guild ${guild.id}:`, error);
    return null;
  }
}

export async function sendLogToAllGuilds(
  client: Client,
  embed: any
): Promise<void> {
  try {
    const guilds = await client.guilds.fetch();
    for (const guild of guilds.values()) {
      const fullGuild = await guild.fetch();
      const logChannel = await getOrCreateLogChannel(client, fullGuild);
      if (logChannel) {
        try {
          await logChannel.send({ embeds: [embed] });
        } catch (error) {
          console.error(
            `Error sending log message to guild ${fullGuild.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending logs to all guilds:", error);
  }
}

