import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";

// On récupère les données de toutes les commandes pour les déployer
const commandsData = Object.values(commands).map((command) => command.data);

// On crée le client REST pour communiquer avec l'API Discord
const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

type DeployCommandsProps = {
  guildId: string;
};

/**
 * Déploie les commandes slash dans un serveur Discord spécifique
 * Cette fonction doit être appelée quand le bot rejoint un serveur ou au démarrage
 */
export async function deployCommands({ guildId }: DeployCommandsProps) {
  try {
    console.log("Déploiement des commandes slash...");

    // On envoie les commandes à Discord pour ce serveur spécifique
    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
      {
        body: commandsData,
      }
    );

    console.log("Commandes slash déployées avec succès !");
  } catch (error) {
    console.error("Erreur lors du déploiement des commandes:", error);
  }
}
