import { db } from "../db";
import { sites } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Interface pour représenter un site surveillé
 */
export interface Site {
  alias: string; // Nom court pour identifier le site
  url: string; // URL complète du site
  testUrl: string; // URL de test du site
  guildId: string; // ID du serveur Discord
  uptimeInterval: number; // Intervalle de vérification en minutes
  lastCheck?: Date; // Date de la dernière vérification
  status?: "up" | "down"; // Statut actuel
  lastStatusChange?: Date; // Date du dernier changement de statut
  setupMessageId?: string; // ID du message de configuration Discord
  setupChannelId?: string; // ID du channel où se trouve le message de config
}

/**
 * Charge tous les sites depuis la base de données
 * Si un guildId est fourni, ne charge que les sites de ce serveur
 */
export async function loadSites(guildId?: string): Promise<Site[]> {
  try {
    // On construit la requête selon si on veut tous les sites ou juste ceux d'un serveur
    const query = guildId 
      ? db.select().from(sites).where(eq(sites.guildId, guildId))
      : db.select().from(sites);
    const result = await query;
    // On convertit les résultats en objets Site avec les bonnes dates
    return result.map((site) => ({
      alias: site.alias,
      url: site.url,
      testUrl: site.testUrl,
      guildId: site.guildId,
      uptimeInterval: site.uptimeInterval ?? 5, // Par défaut 5 minutes
      lastCheck: site.lastCheck ? new Date(site.lastCheck) : undefined,
      status: site.status as "up" | "down" | undefined,
      lastStatusChange: site.lastStatusChange
        ? new Date(site.lastStatusChange)
        : undefined,
      setupMessageId: site.setupMessageId ?? undefined,
      setupChannelId: site.setupChannelId ?? undefined,
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des sites:", error);
    return [];
  }
}

/**
 * Ajoute un nouveau site à surveiller dans la base de données
 * Lance une erreur si l'alias existe déjà dans ce serveur
 */
export async function addSite(site: Site): Promise<void> {
  try {
    await db.insert(sites).values({
      alias: site.alias,
      url: site.url,
      testUrl: site.testUrl,
      guildId: site.guildId,
      uptimeInterval: site.uptimeInterval,
      status: site.status,
      lastCheck: site.lastCheck,
      lastStatusChange: site.lastStatusChange,
      setupMessageId: site.setupMessageId,
      setupChannelId: site.setupChannelId,
    });
  } catch (error: any) {
    // Code d'erreur PostgreSQL pour violation de contrainte unique
    if (error?.code === "23505") {
      throw new Error(`Un site avec l'alias "${site.alias}" existe déjà dans ce serveur.`);
    }
    throw error;
  }
}

/**
 * Supprime un site de la surveillance
 * Retourne true si le site a été supprimé, false s'il n'existait pas
 */
export async function removeSite(alias: string, guildId: string): Promise<boolean> {
  try {
    // On vérifie d'abord si le site existe avant de le supprimer
    const existingSite = await getSite(alias, guildId);
    if (!existingSite) {
      return false;
    }

    await db.delete(sites).where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression du site:", error);
    return false;
  }
}

/**
 * Récupère un site spécifique par son alias et son serveur
 * Retourne undefined si le site n'existe pas
 */
export async function getSite(alias: string, guildId: string): Promise<Site | undefined> {
  try {
    const result = await db
      .select()
      .from(sites)
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const site = result[0];
    // On convertit les dates et on retourne l'objet Site
    return {
      alias: site.alias,
      url: site.url,
      testUrl: site.testUrl,
      guildId: site.guildId,
      uptimeInterval: site.uptimeInterval ?? 5,
      lastCheck: site.lastCheck ? new Date(site.lastCheck) : undefined,
      status: site.status as "up" | "down" | undefined,
      lastStatusChange: site.lastStatusChange
        ? new Date(site.lastStatusChange)
        : undefined,
      setupMessageId: site.setupMessageId ?? undefined,
      setupChannelId: site.setupChannelId ?? undefined,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du site:", error);
    return undefined;
  }
}

/**
 * Met à jour le statut d'un site (en ligne/hors ligne)
 * Si guildId n'est pas fourni, met à jour tous les sites avec cet alias (pour compatibilité)
 * Met à jour aussi la date de dernière vérification et la date de changement de statut si nécessaire
 */
export async function updateSiteStatus(
  alias: string,
  status: "up" | "down",
  guildId?: string
): Promise<void> {
  try {
    // Si pas de guildId, on met à jour tous les sites avec cet alias
    // (utile pour le monitoring qui peut avoir besoin de mettre à jour plusieurs serveurs)
    if (!guildId) {
      const allSites = await loadSites();
      const sitesWithAlias = allSites.filter(s => s.alias === alias);
      for (const site of sitesWithAlias) {
        const previousStatus = site.status;
        const now = new Date();
        const updateData: any = {
          status,
          lastCheck: now,
        };

        // On met à jour la date de changement de statut seulement si le statut a vraiment changé
        if (previousStatus !== status) {
          updateData.lastStatusChange = now;
        }

        await db.update(sites).set(updateData).where(and(eq(sites.alias, alias), eq(sites.guildId, site.guildId)));
      }
      return;
    }

    // Sinon, on met à jour seulement le site du serveur spécifié
    const site = await getSite(alias, guildId);
    if (!site) {
      return; // Le site n'existe pas, on ne fait rien
    }

    const previousStatus = site.status;
    const now = new Date();
    const updateData: any = {
      status,
      lastCheck: now,
    };

    // On met à jour la date de changement de statut seulement si le statut a vraiment changé
    if (previousStatus !== status) {
      updateData.lastStatusChange = now;
    }

    await db.update(sites).set(updateData).where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut du site:", error);
  }
}

/**
 * Met à jour l'intervalle de vérification d'un site
 * Retourne true si la mise à jour a réussi, false si le site n'existe pas
 */
export async function updateSiteUptime(
  alias: string,
  uptimeInterval: number,
  guildId: string
): Promise<boolean> {
  try {
    // On vérifie d'abord si le site existe
    const existingSite = await getSite(alias, guildId);
    if (!existingSite) {
      return false;
    }

    await db
      .update(sites)
      .set({ uptimeInterval })
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'intervalle:", error);
    return false;
  }
}

/**
 * Sauvegarde l'ID du message et du channel de configuration pour un site
 * Permet de mettre à jour automatiquement le message plus tard
 * Retourne true si la sauvegarde a réussi, false si le site n'existe pas
 */
export async function setSetupMessage(
  alias: string,
  messageId: string,
  channelId: string,
  guildId: string
): Promise<boolean> {
  try {
    // On vérifie d'abord si le site existe
    const existingSite = await getSite(alias, guildId);
    if (!existingSite) {
      return false;
    }

    await db
      .update(sites)
      .set({
        setupMessageId: messageId,
        setupChannelId: channelId,
      })
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du message de configuration:", error);
    return false;
  }
}

