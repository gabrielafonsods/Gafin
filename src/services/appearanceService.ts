import { getSettings, saveSettings } from "@/database/repositories";
import type { Theme } from "@/database/schema";

/** "system" remove o atributo e deixa a media query (prefers-color-scheme) decidir. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export async function setTheme(theme: Theme): Promise<void> {
  const settings = await getSettings();
  await saveSettings({ ...settings, theme });
  applyTheme(theme);
}
