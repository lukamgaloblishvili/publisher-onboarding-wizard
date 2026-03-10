import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form);
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-copy">
          <div className="login-logo-wrap">
            <img
              className="login-logo"
              src="/px-logo.svg"
              alt="PX"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
          <span className="eyebrow">PX Publisher Operations</span>
          <h1>Onboarding Wizard</h1>
          <p>Track campaigns, integration conversations, compliance uploads, and shared Slack coordination in one place.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button className="primary-button" disabled={loading}>
            Sign in
          </button>
          <div className="demo-credentials">
            <strong>Demo logins</strong>
            <span>`admin` / `admin123`</span>
            <span>`publisher` / `publisher123`</span>
          </div>
        </form>
      </div>
    </div>
  );
}
