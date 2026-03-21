interface ViewSwitcherProps {
  activeView: "calendar" | "list" | "map";
  onNavigate: (view: "calendar" | "list" | "map") => void;
  /** If provided, renders the Today button with this handler. Omit on views where Today has no meaning. */
  onToday?: () => void;
  /** If provided, renders a Home (go to location) button with this handler. */
  onHome?: () => void;
  /** If provided, renders a Search button with this handler. */
  onSearch?: () => void;
  className?: string;
}

export default function ViewSwitcher({ activeView, onNavigate, onToday, onHome, onSearch, className }: ViewSwitcherProps) {
  const cls = ["calendar-view-switcher", className].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      {onToday && (
        <button className="calendar-view-btn calendar-view-btn--today" onClick={onToday}>
          Today
        </button>
      )}
      {onHome && (
        <button className="calendar-view-btn calendar-view-btn--today" onClick={onHome}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Home
        </button>
      )}
      {onSearch && (
        <button className="calendar-view-btn calendar-view-btn--search" onClick={onSearch}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Search
        </button>
      )}
      <div className="calendar-view-switcher-spacer" />
      <button
        className={`calendar-view-btn${activeView === "calendar" ? " calendar-view-btn--active" : ""}`}
        onClick={activeView !== "calendar" ? () => onNavigate("calendar") : undefined}
        aria-current={activeView === "calendar" ? "page" : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Calendar
      </button>
      <button
        className={`calendar-view-btn${activeView === "list" ? " calendar-view-btn--active" : ""}`}
        onClick={activeView !== "list" ? () => onNavigate("list") : undefined}
        aria-current={activeView === "list" ? "page" : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        List
      </button>
      <button
        className={`calendar-view-btn${activeView === "map" ? " calendar-view-btn--active" : ""}`}
        onClick={activeView !== "map" ? () => onNavigate("map") : undefined}
        aria-current={activeView === "map" ? "page" : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        Map
      </button>
    </div>
  );
}
