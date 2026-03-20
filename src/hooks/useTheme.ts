import { useState, useEffect, useCallback } from "react";
import { THEME_NAMES } from "../utils/themes";
import type { ThemeName } from "../utils/themes";

export type { ThemeName } from "../utils/themes";
export type ColorMode = "auto" | "light" | "dark";

const THEME_KEY = "bsl-theme";
const MODE_KEY = "bsl-color-mode";

function getStoredTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_KEY);
  // Migrate old "classic" key to "azure"
  if (stored === "classic") return "azure";
  return (stored as ThemeName) || "azure";
}

function getStoredMode(): ColorMode {
  return (localStorage.getItem(MODE_KEY) as ColorMode) || "auto";
}

function applyDark(mode: ColorMode) {
  const isDark =
    mode === "dark" ||
    (mode === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.toggleAttribute("data-dark", isDark);
}

function applyTheme(theme: ThemeName) {
  if (theme === "azure") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(getStoredTheme);
  const [colorMode, setColorModeState] = useState<ColorMode>(getStoredMode);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyDark(colorMode);
    localStorage.setItem(MODE_KEY, colorMode);
  }, [colorMode]);

  // Listen for OS dark mode changes when in "auto" mode
  useEffect(() => {
    if (colorMode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyDark("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [colorMode]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);
  const setColorMode = useCallback((m: ColorMode) => setColorModeState(m), []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEME_NAMES.indexOf(prev);
      return THEME_NAMES[(idx + 1) % THEME_NAMES.length];
    });
  }, []);

  return { theme, colorMode, setTheme, setColorMode, toggleTheme };
}
