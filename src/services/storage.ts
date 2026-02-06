import { db } from "../db";
import { sites } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface Site {
  alias: string;
  url: string;
  testUrl?: string;
  secret?: string;
  guildId: string;
  uptimeInterval: number;
  consecutiveFailures: number;
  lastCheck?: Date;
  status?: "up" | "down";
  lastStatusChange?: Date;
  setupMessageId?: string;
  setupChannelId?: string;
}

export async function loadSites(guildId?: string): Promise<Site[]> {
  try {
    const query = guildId
      ? db.select().from(sites).where(eq(sites.guildId, guildId))
      : db.select().from(sites);

    const result = await query;

    return result.map((site) => ({
      alias: site.alias,
      url: site.url,
      testUrl: site.testUrl ?? undefined,
      secret: site.secret ?? undefined,
      guildId: site.guildId,
      uptimeInterval: site.uptimeInterval ?? 5,
      consecutiveFailures: site.consecutiveFailures ?? 0,
      lastCheck: site.lastCheck ? new Date(site.lastCheck) : undefined,
      status: site.status as "up" | "down" | undefined,
      lastStatusChange: site.lastStatusChange
        ? new Date(site.lastStatusChange)
        : undefined,
      setupMessageId: site.setupMessageId ?? undefined,
      setupChannelId: site.setupChannelId ?? undefined,
    }));
  } catch (error) {
    console.error("[Storage] Failed to load sites:", error);
    return [];
  }
}

export async function addSite(
  site: Omit<Site, "consecutiveFailures">
): Promise<void> {
  try {
    await db.insert(sites).values({
      alias: site.alias,
      url: site.url,
      testUrl: site.testUrl,
      secret: site.secret,
      guildId: site.guildId,
      uptimeInterval: site.uptimeInterval,
      consecutiveFailures: 0,
      status: site.status,
      lastCheck: site.lastCheck,
      lastStatusChange: site.lastStatusChange,
      setupMessageId: site.setupMessageId,
      setupChannelId: site.setupChannelId,
    });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "23505") {
      throw new Error(
        `L'alias "${site.alias}" est déjà utilisé sur ce serveur.`
      );
    }
    throw error;
  }
}

export async function removeSite(
  alias: string,
  guildId: string
): Promise<boolean> {
  try {
    const existingSite = await getSite(alias, guildId);
    if (!existingSite) return false;

    await db
      .delete(sites)
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
    return true;
  } catch (error) {
    console.error("[Storage] Delete failed:", error);
    return false;
  }
}

export async function getSite(
  alias: string,
  guildId: string
): Promise<Site | undefined> {
  try {
    const [site] = await db
      .select()
      .from(sites)
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)))
      .limit(1);

    if (!site) return undefined;

    return {
      alias: site.alias,
      url: site.url,
      testUrl: site.testUrl ?? undefined,
      secret: site.secret ?? undefined,
      guildId: site.guildId,
      uptimeInterval: site.uptimeInterval ?? 5,
      consecutiveFailures: site.consecutiveFailures ?? 0,
      lastCheck: site.lastCheck ? new Date(site.lastCheck) : undefined,
      status: site.status as "up" | "down" | undefined,
      lastStatusChange: site.lastStatusChange
        ? new Date(site.lastStatusChange)
        : undefined,
      setupMessageId: site.setupMessageId ?? undefined,
      setupChannelId: site.setupChannelId ?? undefined,
    };
  } catch (error) {
    console.error("[Storage] Fetch failed:", error);
    return undefined;
  }
}

export async function updateSiteStatus(
  alias: string,
  status: "up" | "down",
  guildId?: string,
  consecutiveFailures?: number
): Promise<void> {
  try {
    if (!guildId) {
      const allSites = await loadSites();
      const targets = allSites.filter((s) => s.alias === alias);

      for (const site of targets) {
        const now = new Date();
        const updateData: {
          status: "up" | "down";
          lastCheck: Date;
          lastStatusChange?: Date;
          consecutiveFailures?: number;
        } = {
          status,
          lastCheck: now,
        };

        if (consecutiveFailures !== undefined) {
          updateData.consecutiveFailures = consecutiveFailures;
        }

        if (site.status !== status) {
          updateData.lastStatusChange = now;
        }

        await db
          .update(sites)
          .set(updateData)
          .where(and(eq(sites.alias, alias), eq(sites.guildId, site.guildId)));
      }
      return;
    }

    const site = await getSite(alias, guildId);
    if (!site) return;

    const now = new Date();
    const updateData: {
      status: "up" | "down";
      lastCheck: Date;
      lastStatusChange?: Date;
      consecutiveFailures?: number;
    } = {
      status,
      lastCheck: now,
    };

    if (consecutiveFailures !== undefined) {
      updateData.consecutiveFailures = consecutiveFailures;
    }

    if (site.status !== status) {
      updateData.lastStatusChange = now;
    }

    await db
      .update(sites)
      .set(updateData)
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
  } catch (error) {
    console.error("[Storage] Status update failed:", error);
  }
}

export async function setSetupMessage(
  alias: string,
  messageId: string,
  channelId: string,
  guildId: string
): Promise<boolean> {
  try {
    const existing = await getSite(alias, guildId);
    if (!existing) return false;

    await db
      .update(sites)
      .set({ setupMessageId: messageId, setupChannelId: channelId })
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
    return true;
  } catch (error) {
    console.error("[Storage] Setup message save failed:", error);
    return false;
  }
}

export async function clearSetupMessage(
  alias: string,
  guildId: string
): Promise<boolean> {
  try {
    await db
      .update(sites)
      .set({ setupMessageId: null, setupChannelId: null })
      .where(and(eq(sites.alias, alias), eq(sites.guildId, guildId)));
    return true;
  } catch (error) {
    console.error("[Storage] Clear setup message failed:", error);
    return false;
  }
}

export async function updateSiteInfo(
  currentAlias: string,
  guildId: string,
  updates: {
    newAlias?: string;
    testUrl?: string;
    uptimeInterval?: number;
    secret?: string;
  }
): Promise<boolean> {
  try {
    const site = await getSite(currentAlias, guildId);
    if (!site) return false;

    if (updates.newAlias && updates.newAlias !== currentAlias) {
      if (await getSite(updates.newAlias, guildId)) {
        throw new Error(`L'alias "${updates.newAlias}" est déjà pris.`);
      }
    }

    const updateData: {
      alias?: string;
      testUrl?: string;
      uptimeInterval?: number;
      secret?: string;
    } = {};
    if (updates.newAlias) updateData.alias = updates.newAlias;
    if (updates.testUrl !== undefined) updateData.testUrl = updates.testUrl;
    if (updates.uptimeInterval !== undefined)
      updateData.uptimeInterval = updates.uptimeInterval;
    if (updates.secret !== undefined) updateData.secret = updates.secret;

    if (Object.keys(updateData).length === 0) return true;

    await db
      .update(sites)
      .set(updateData)
      .where(and(eq(sites.alias, currentAlias), eq(sites.guildId, guildId)));

    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("déjà pris"))
      throw error;
    console.error("[Storage] Info update failed:", error);
    throw new Error("Impossible de mettre à jour le site.");
  }
}

