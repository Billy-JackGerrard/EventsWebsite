import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./Login.css";

type Props = {
  onLogin: () => void;
};

type Screen = "login" | "forgot" | "forgot-sent" | "reset" | "reset-done";

export default function Login({ onLogin }: Props) {
  const [screen, setScreen] = useState<Screen>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearError = () => setError(null);

  // When the user clicks the reset link in their email, Supabase fires
  // PASSWORD_RECOVERY. We listen here so the reset screen appears automatically.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event) => {
      if (_event === "PASSWORD_RECOVERY") setScreen("reset");
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setLoading(true);
    clearError();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onLogin();
    setLoading(false);
  };

  // ── Forgot password ────────────────────────────────────────────────────────

  const handleSendReset = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    clearError();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setError(error.message);
    else setScreen("forgot-sent");
    setLoading(false);
  };

  // ── Reset password (after clicking email link) ─────────────────────────────

  const handleSavePassword = async () => {
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    clearError();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError(error.message);
    else setScreen("reset-done");
    setLoading(false);
  };

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === "forgot") {
    return (
      <div className="login-page">
        <div className="page-card login-card">
          <h2 className="login-title">Reset Password</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textAlign: "center", marginBottom: "1.25rem", fontStyle: "italic" }}>
            Enter your email and we'll send you a reset link.
          </p>
          {error && <div className="form-error">{error}</div>}
          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="e.g. admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendReset()}
              autoFocus
            />
          </div>
          <button className="btn-primary" onClick={handleSendReset} disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
          <button className="login-back-btn" onClick={() => { clearError(); setScreen("login"); }}>
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (screen === "forgot-sent") {
    return (
      <div className="login-page">
        <div className="page-card login-card">
          <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
            <div className="login-success-icon">✉</div>
            <h2 className="login-title">Check Your Email</h2>
            <p style={{ color: "var(--color-text-primary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem", opacity: 0.8 }}>
              If an account exists for{" "}
              <strong style={{ color: "var(--color-accent)" }}>{email}</strong>,
              a reset link has been sent. Check your inbox.
            </p>
            <button className="btn-primary" onClick={() => { clearError(); setScreen("login"); }}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "reset") {
    return (
      <div className="login-page">
        <div className="page-card login-card">
          <h2 className="login-title">New Password</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textAlign: "center", marginBottom: "1.25rem", fontStyle: "italic" }}>
            Choose a new password for your account.
          </p>
          {error && <div className="form-error">{error}</div>}
          <div className="form-field">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSavePassword()}
            />
          </div>
          <button className="btn-primary" onClick={handleSavePassword} disabled={loading}>
            {loading ? "Saving…" : "Save New Password"}
          </button>
        </div>
      </div>
    );
  }

  if (screen === "reset-done") {
    return (
      <div className="login-page">
        <div className="page-card login-card">
          <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
            <div className="login-success-icon">✓</div>
            <h2 className="login-title">Password Updated</h2>
            <p style={{ color: "var(--color-text-primary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem", opacity: 0.8 }}>
              Your password has been changed successfully.
            </p>
            <button className="btn-primary" onClick={onLogin}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Default: login screen ──────────────────────────────────────────────────

  return (
    <div className="login-page">
      <div className="page-card login-card">
        <h2 className="login-title">Admin Login</h2>
        {error && <div className="form-error">{error}</div>}
        <div className="form-field">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>
        <button className="btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
        <button className="login-back-btn" onClick={() => { clearError(); setScreen("forgot"); }}>
          Forgot your password?
        </button>
      </div>
    </div>
  );
}