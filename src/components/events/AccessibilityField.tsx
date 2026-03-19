import { useState } from "react";

const ADVANCED_ACCESS_OPTIONS: Record<string, string[]> = {
  Audio: ["Hearing loop (T-loop)", "Audio description"],
  Physical: ["Wheelchair accessible", "Step-free access", "Accessible toilets", "Quiet room available"],
  Sensory: ["Low sensory environment", "Relaxed performance"],
};
const ALL_ADVANCED_OPTIONS = Object.values(ADVANCED_ACCESS_OPTIONS).flat();

type Props = {
  accessibility: string[];
  accessibilityOther: string;
  onAccessibilityChange: (value: string[]) => void;
  onAccessibilityOtherChange: (value: string) => void;
};

export { ALL_ADVANCED_OPTIONS };

export default function AccessibilityField({
  accessibility,
  accessibilityOther,
  onAccessibilityChange,
  onAccessibilityOtherChange,
}: Props) {
  const [showMore, setShowMore] = useState(
    () => accessibility.some(o => ALL_ADVANCED_OPTIONS.includes(o)) || accessibilityOther !== ""
  );

  const toggle = (option: string) => {
    onAccessibilityChange(
      accessibility.includes(option)
        ? accessibility.filter(o => o !== option)
        : [...accessibility, option]
    );
  };

  return (
    <div className="form-field">
      <label className="form-label">Accessibility</label>
      <div className="event-type-toggle">
        {["Delivered in BSL", "BSL/English Interpreter", "Captioned"].map(option => (
          <button
            key={option}
            type="button"
            className={`event-type-btn${accessibility.includes(option) ? ' event-type-btn--active' : ''}`}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`accessibility-more-btn${showMore ? ' accessibility-more-btn--open' : ''}`}
        onClick={() => setShowMore(v => !v)}
      >
        <span className="accessibility-more-btn__arrow">{showMore ? '▾' : '▸'}</span>
        More accessibility options
      </button>
      {showMore && (
        <div className="accessibility-expanded">
          {Object.entries(ADVANCED_ACCESS_OPTIONS).map(([group, options]) => (
            <div key={group} className="accessibility-group">
              <span className="accessibility-group-label">{group}</span>
              <div className="event-type-toggle">
                {options.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`event-type-btn${accessibility.includes(option) ? ' event-type-btn--active' : ''}`}
                    onClick={() => toggle(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="accessibility-group">
            <span className="accessibility-group-label">Other</span>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. SubPac devices available"
              value={accessibilityOther}
              onChange={e => onAccessibilityOtherChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
