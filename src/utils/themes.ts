/** Central registry for colour themes. */

export type ThemeName =
  | "azure"
  | "ocean"
  | "ember"
  | "amethyst"
  | "forest"
  | "rose"
  | "parchment";

export interface ThemeMeta {
  name: ThemeName;
  /** Human-readable label shown in the UI */
  label: string;
  /** Representative swatch colour for the picker UI */
  color: string;
}

export const THEMES: readonly ThemeMeta[] = [
  { name: "azure",    label: "Azure",     color: "#2563eb" },
  { name: "ocean",     label: "Ocean",     color: "#22d3d3" },
  { name: "ember",     label: "Ember",     color: "#e85d04" },
  { name: "amethyst",  label: "Amethyst",  color: "#7c3aed" },
  { name: "forest",    label: "Forest",    color: "#059669" },
  { name: "rose",      label: "Rose",      color: "#e11d48" },
  { name: "parchment", label: "Parchment", color: "#2d6a9f" },
] as const;

export const THEME_NAMES: readonly ThemeName[] = THEMES.map((t) => t.name);

/** Return the label for the *next* theme in the cycle (used on toggle buttons). */
export function nextThemeLabel(current: ThemeName): string {
  const idx = THEME_NAMES.indexOf(current);
  return THEMES[(idx + 1) % THEMES.length].label;
}
