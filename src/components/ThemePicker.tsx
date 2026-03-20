import { useState, useRef, useCallback } from "react";
import { THEMES } from "../utils/themes";
import type { ThemeName } from "../utils/themes";
import type { ColorMode } from "../hooks/useTheme";
import { useClickOutside } from "../hooks/useClickOutside";
import "./ThemePicker.css";

type Props = {
  theme: ThemeName;
  colorMode: ColorMode;
  onSetTheme: (t: ThemeName) => void;
  onSetColorMode: (m: ColorMode) => void;
};

export default function ThemePicker({ theme, colorMode, onSetTheme, onSetColorMode }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const activeColor = THEMES.find(t => t.name === theme)?.color;

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className={`theme-picker-btn${open ? " theme-picker-btn--open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Customise appearance"
        aria-expanded={open}
        type="button"
      >
        <span className="theme-picker-btn-dot" style={{ background: activeColor }} aria-hidden="true" />
        <span aria-hidden="true" style={{ fontSize: "15px", lineHeight: 1 }}>🎨</span>
      </button>

      {open && (
        <div className="theme-picker-dropdown" role="dialog" aria-label="Appearance settings">
          <p className="theme-picker-section-label">Theme</p>
          <div className="theme-picker-swatches">
            {THEMES.map(t => (
              <button
                key={t.name}
                className={`theme-picker-swatch${theme === t.name ? " theme-picker-swatch--active" : ""}`}
                onClick={() => onSetTheme(t.name)}
                title={t.label}
                type="button"
              >
                <span className="theme-picker-swatch-dot" style={{ background: t.color }} />
                <span className="theme-picker-swatch-label">{t.label}</span>
                {theme === t.name && (
                  <svg className="theme-picker-check" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <p className="theme-picker-section-label">Appearance</p>
          <div className="theme-picker-modes">
            {(["light", "auto", "dark"] as ColorMode[]).map(m => (
              <button
                key={m}
                className={`theme-picker-mode-btn${colorMode === m ? " theme-picker-mode-btn--active" : ""}`}
                onClick={() => onSetColorMode(m)}
                type="button"
              >
                {m === "light" ? "☀️ Light" : m === "dark" ? "🌙 Dark" : "Auto"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
