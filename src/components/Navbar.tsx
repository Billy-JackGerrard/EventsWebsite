import type { View } from "../utils/views";
import "./Navbar.css";

type Props = {
  currentView: View;
  isLoggedIn: boolean;
  pendingCount: number;
  onNavigate: (view: View) => void;
  onLogout: () => void;
};

export default function Navbar({ currentView, isLoggedIn, pendingCount, onNavigate, onLogout }: Props) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Edinburgh BSL Community</div>
      <div className="navbar-links">

        <a
          className="navbar-link navbar-link--whatsapp"
          href="https://chat.whatsapp.com/YOUR_INVITE_CODE"
          target="_blank"
          rel="noopener noreferrer"
        >
          💬 WhatsApp
        </a>

        <button
          className={`navbar-link ${currentView === "calendar" ? "navbar-link--active" : ""}`}
          onClick={() => onNavigate("calendar")}
        >
          Calendar
        </button>

        <button
          className={`navbar-link ${currentView === "add-event" ? "navbar-link--active" : ""}`}
          onClick={() => onNavigate("add-event")}
        >
          Add Event
        </button>

        <button
          className={`navbar-link ${currentView === "contact" ? "navbar-link--active" : ""}`}
          onClick={() => onNavigate("contact")}
        >
          Contact
        </button>

        {isLoggedIn ? (
          <>
            <button
              className={`navbar-link navbar-link--queue ${currentView === "admin-queue" ? "navbar-link--active" : ""}`}
              onClick={() => onNavigate("admin-queue")}
            >
              Pending Events
              {pendingCount > 0 && (
                <span className="navbar-pending-badge">{pendingCount}</span>
              )}
            </button>
            <button className="navbar-link navbar-link--logout" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <button
            className={`navbar-link ${currentView === "login" ? "navbar-link--active" : ""}`}
            onClick={() => onNavigate("login")}
          >
            Admin Login
          </button>
        )}
      </div>
    </nav>
  );
}