import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { db } from "../db";
import { sql } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Vérifie la latence du bot et de la base de données");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const botLatency = Date.now() - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);

  let dbStatus = "✅ Connectée";
  let dbLatency = "N/A";

  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatency = `${Date.now() - start}ms`;
  } catch (error) {
    dbStatus = "❌ Déconnectée";
    console.error("[Ping] Database error:", error);
  }

  const embed = new EmbedBuilder()
    .setTitle("🏓 Pong !")
    .setColor(dbStatus.startsWith("✅") ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: "Bot Latency", value: `${botLatency}ms`, inline: true },
      { name: "API Latency", value: `${apiLatency}ms`, inline: true },
      { name: "DB Latency", value: dbLatency, inline: true },
      { name: "DB Status", value: dbStatus, inline: false }
    )
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}
