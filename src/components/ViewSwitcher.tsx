interface ViewSwitcherProps {
  activeView: "calendar" | "list" | "map";
  onNavigate: (view: "calendar" | "list" | "map") => void;
  /** If provided, renders the Today button with this handler. Omit on views where Today has no meaning. */
  onToday?: () => void;
  /** If provided, renders a Search button with this handler. */
  onSearch?: () => void;
  className?: string;
}

export default function ViewSwitcher({ activeView, onNavigate, onToday, onSearch, className }: ViewSwitcherProps) {
  const cls = ["calendar-view-switcher", className].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      {onToday && (
        <button className="calendar-view-btn calendar-view-btn--today" onClick={onToday}>
          Today
        </button>
      )}
      {onSearch && (
        <button className="calendar-view-btn calendar-view-btn--search" onClick={onSearch}>
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
