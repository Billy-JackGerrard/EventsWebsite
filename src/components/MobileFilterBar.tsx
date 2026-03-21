import "./MobileFilterBar.css";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  activeCount?: number;
  children: React.ReactNode;
}

export default function MobileFilterBar({ collapsed, onToggle, activeCount, children }: Props) {
  return (
    <div className={`mobile-filter-bar${collapsed ? " mobile-filter-bar--collapsed" : ""}`}>
      <button
        className="mobile-filter-bar-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span className="mobile-filter-bar-toggle-label">
          Filters{activeCount ? ` (${activeCount})` : ""}
        </span>
        <span className="mobile-filter-bar-toggle-arrow">{collapsed ? "▲" : "▼"}</span>
      </button>
      {!collapsed && children}
    </div>
  );
}
