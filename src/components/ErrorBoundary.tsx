import { Component, type ReactNode } from "react";
import "./ErrorBoundary.css";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12.5" />
          <circle cx="12" cy="16" r="0.5" fill="var(--color-text-muted)" />
        </svg>

        <div className="error-boundary-body">
          <h2 className="error-boundary-heading">Something went wrong</h2>
          <p className="error-boundary-message">
            An unexpected error occurred. Try reloading the page — if it keeps happening, let us know via the contact form.
          </p>
        </div>

        <button className="error-boundary-btn" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}
