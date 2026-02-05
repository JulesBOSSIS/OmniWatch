import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface Site {
  alias: string;
  url: string;
  uptimeInterval: number; // en minutes
  lastCheck?: Date;
  status?: "up" | "down";
  lastStatusChange?: Date;
  setupMessageId?: string;
  setupChannelId?: string;
}

const STORAGE_FILE = join(process.cwd(), "sites.json");

export function loadSites(): Site[] {
  if (!existsSync(STORAGE_FILE)) {
    return [];
  }
  try {
    const data = readFileSync(STORAGE_FILE, "utf-8");
    const sites = JSON.parse(data) as Site[];
    // Convertir les dates string en objets Date
    return sites.map((site) => ({
      ...site,
      lastCheck: site.lastCheck ? new Date(site.lastCheck) : undefined,
      lastStatusChange: site.lastStatusChange
        ? new Date(site.lastStatusChange)
        : undefined,
    }));
  } catch (error) {
    console.error("Error loading sites:", error);
    return [];
  }
}

export function saveSites(sites: Site[]): void {
  try {
    writeFileSync(STORAGE_FILE, JSON.stringify(sites, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving sites:", error);
    throw error;
  }
}

export function addSite(site: Site): void {
  const sites = loadSites();
  if (sites.some((s) => s.alias === site.alias)) {
    throw new Error(`Un site avec l'alias "${site.alias}" existe déjà.`);
  }
  sites.push(site);
  saveSites(sites);
}

export function removeSite(alias: string): boolean {
  const sites = loadSites();
  const initialLength = sites.length;
  const filtered = sites.filter((s) => s.alias !== alias);
  if (filtered.length === initialLength) {
    return false;
  }
  saveSites(filtered);
  return true;
}

export function getSite(alias: string): Site | undefined {
  const sites = loadSites();
  return sites.find((s) => s.alias === alias);
}

export function updateSiteStatus(
  alias: string,
  status: "up" | "down"
): void {
  const sites = loadSites();
  const site = sites.find((s) => s.alias === alias);
  if (!site) {
    return;
  }

  const previousStatus = site.status;
  site.status = status;
  site.lastCheck = new Date();

  if (previousStatus !== status) {
    site.lastStatusChange = new Date();
  }

  saveSites(sites);
}

export function updateSiteUptime(alias: string, uptimeInterval: number): boolean {
  const sites = loadSites();
  const site = sites.find((s) => s.alias === alias);
  if (!site) {
    return false;
  }

  site.uptimeInterval = uptimeInterval;
  saveSites(sites);
  return true;
}

export function setSetupMessage(
  alias: string,
  messageId: string,
  channelId: string
): boolean {
  const sites = loadSites();
  const site = sites.find((s) => s.alias === alias);
  if (!site) {
    return false;
  }

  site.setupMessageId = messageId;
  site.setupChannelId = channelId;
  saveSites(sites);
  return true;
}

