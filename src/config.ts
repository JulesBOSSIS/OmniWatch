import "dotenv/config";

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

// On vérifie que les variables d'environnement essentielles sont présentes
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error("Variables d'environnement manquantes : DISCORD_TOKEN et DISCORD_CLIENT_ID sont requis");
}

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
};
