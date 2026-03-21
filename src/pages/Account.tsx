import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./Account.css";

type Props = {
  email: string | null;
  displayName: string | null;
  onLogout: () => void;
};

export default function Account({ email, displayName, onLogout }: Props) {
  // ── Display name ──────────────────────────────────────────────────────────
  const [name, setName] = useState(displayName ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  // ── Email ─────────────────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // ── Password ──────────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) { setNameError("Name cannot be empty."); return; }
    setNameSaving(true);
    setNameError(null);
    setNameSuccess(false);
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    setNameSaving(false);
    if (error) { setNameError(error.message); return; }
    setNameSuccess(true);
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) { setEmailError("Email cannot be empty."); return; }
    setEmailSaving(true);
    setEmailError(null);
    setEmailSuccess(false);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailSaving(false);
    if (error) { setEmailError(error.message); return; }
    setEmailSuccess(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword) { setPasswordError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message); return; }
    setPasswordSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="account-page">
      <div className="page-card account-card">
        <h1 className="account-title">Account Settings</h1>

        {/* ── Display Name ── */}
        <section className="account-section">
          <h2 className="account-section-heading">Display Name</h2>
          {nameError && <div className="form-error" role="alert">{nameError}</div>}
          {nameSuccess && <div className="account-success">Name updated.</div>}
          <div className="form-field">
            <label htmlFor="account-name" className="form-label">Name</label>
            <input
              id="account-name"
              className="form-input"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameSuccess(false); setNameError(null); }}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
            />
          </div>
          <button
            className="btn-primary account-save-btn"
            onClick={handleSaveName}
            disabled={nameSaving}
          >
            {nameSaving ? (
              <span className="btn-loading">
                <span className="btn-spinner" aria-hidden="true" />
                Saving…
              </span>
            ) : "Save Name"}
          </button>
        </section>

        <div className="account-divider" />

        {/* ── Email ── */}
        <section className="account-section">
          <h2 className="account-section-heading">Email Address</h2>
          {emailError && <div className="form-error" role="alert">{emailError}</div>}
          {emailSuccess && (
            <div className="account-success">
              Confirmation sent — check your inbox to verify the new address.
            </div>
          )}
          <div className="form-field">
            <label htmlFor="account-email" className="form-label">Email</label>
            <input
              id="account-email"
              className="form-input"
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setEmailSuccess(false); setEmailError(null); }}
              onKeyDown={e => e.key === "Enter" && handleSaveEmail()}
            />
          </div>
          <button
            className="btn-primary account-save-btn"
            onClick={handleSaveEmail}
            disabled={emailSaving}
          >
            {emailSaving ? (
              <span className="btn-loading">
                <span className="btn-spinner" aria-hidden="true" />
                Saving…
              </span>
            ) : "Update Email"}
          </button>
        </section>

        <div className="account-divider" />

        {/* ── Password ── */}
        <section className="account-section">
          <h2 className="account-section-heading">Change Password</h2>
          {passwordError && <div className="form-error" role="alert">{passwordError}</div>}
          {passwordSuccess && <div className="account-success">Password updated successfully.</div>}
          <div className="form-field">
            <label htmlFor="account-new-password" className="form-label">New Password</label>
            <input
              id="account-new-password"
              className="form-input"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordSuccess(false); setPasswordError(null); }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="account-confirm-password" className="form-label">Confirm Password</label>
            <input
              id="account-confirm-password"
              className="form-input"
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordSuccess(false); setPasswordError(null); }}
              onKeyDown={e => e.key === "Enter" && handleSavePassword()}
            />
          </div>
          <button
            className="btn-primary account-save-btn"
            onClick={handleSavePassword}
            disabled={passwordSaving}
          >
            {passwordSaving ? (
              <span className="btn-loading">
                <span className="btn-spinner" aria-hidden="true" />
                Saving…
              </span>
            ) : "Update Password"}
          </button>
        </section>

        <div className="account-divider" />

        {/* ── Log out ── */}
        <section className="account-section account-section--logout">
          <p className="account-logout-label">Signed in as <strong>{email}</strong></p>
          <button className="account-logout-btn" onClick={onLogout}>
            Log Out
          </button>
        </section>
      </div>
    </div>
  );
}
