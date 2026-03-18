import { CATEGORIES, CATEGORY_COLOURS } from "../utils/types";
import "./CategoryLegend.css";

export default function CategoryLegend() {
  return (
    <div className="category-legend">
      {CATEGORIES.map(c => (
        <div key={c} className="category-legend-item">
          <span className="category-legend-dot" style={{ background: CATEGORY_COLOURS[c] }} />
          <span className="category-legend-label">{c}</span>
        </div>
      ))}
    </div>
  );
}
