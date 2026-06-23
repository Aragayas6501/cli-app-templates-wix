import { COLLECTIONS, DEFAULT_UTM } from "@/consts";
import type { AppSettings } from "@/types";
import { items, runElevated, saveItem } from "backend/data";

const COL = COLLECTIONS.settings;

const DEFAULT_SETTINGS: AppSettings = {
  tagEnabled: false,
  defaultUtmCampaign: DEFAULT_UTM.campaign,
};

/** Settings is a single-row collection; return the row or sane defaults. */
export async function getSettings(): Promise<AppSettings> {
  const res = await runElevated(() => items.query(COL).limit(1).find());
  return (res.items[0] as unknown as AppSettings) ?? { ...DEFAULT_SETTINGS };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const existing = await getSettings();
  return (await saveItem(COL, { ...existing, ...patch })) as unknown as AppSettings;
}
