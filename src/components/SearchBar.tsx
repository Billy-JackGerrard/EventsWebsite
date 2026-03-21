import type { RefObject, ReactNode } from "react";

type Props = {
  value: string;
  onChange: (query: string) => void;
  onClose: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  wrapRef?: RefObject<HTMLDivElement | null>;
  /** Extra class(es) applied to the outer wrapper div for layout/positioning. */
  wrapperClassName?: string;
  /** Optional content rendered below the bar (e.g. a search-results dropdown). */
  children?: ReactNode;
};

export default function SearchBar({ value, onChange, onClose, inputRef, wrapRef, wrapperClassName, children }: Props) {
  return (
    <div className={wrapperClassName} ref={wrapRef}>
      <div className="search-bar">
        <svg className="search-bar-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          className="search-bar-input"
          type="text"
          placeholder="Search events…"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Escape" && onClose()}
        />
        <button className="search-bar-close" onClick={onClose} title="Close search">✕</button>
      </div>
      {children}
    </div>
  );
}
