import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginAdmin, loginPublisher } = useAuthStore();
  const [mode, setMode] = useState("publisher");
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [publisherForm, setPublisherForm] = useState({ access_code: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user =
        mode === "admin" ? await loginAdmin(adminForm) : await loginPublisher({ access_code: publisherForm.access_code.trim() });
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-soft lg:grid-cols-[1.15fr_0.85fr]">
        <section className="bg-gradient-to-br from-px-green via-px-deep to-[#0f5f35] px-8 py-10 text-white sm:px-12 sm:py-14">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/10">
            <img className="max-h-14 max-w-14 object-contain" src="/px-logo.svg" alt="PX" />
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-white/75">PX Publisher Operations</span>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">Campaign onboarding in one coordinated workspace.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/82">
            Keep integration, compliance, launch checklists, resources, and shared Slack coordination in one place so new campaigns can onboard and go live
            quickly.
          </p>
          <div className="mt-8 rounded-[1.6rem] border border-white/15 bg-white/10 p-5 text-sm leading-7 text-white/82">
            This portal is not a replacement for{" "}
            <a className="font-semibold underline underline-offset-2" href="https://open.px.com/login" target="_blank" rel="noreferrer">
              open.px.com
            </a>
            . It is a focused onboarding workspace for campaign launch coordination.
          </div>
        </section>
        <section className="px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-6 flex gap-2 rounded-full bg-px-mist p-1">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${mode === "publisher" ? "bg-white text-px-deep shadow-sm" : "text-black/60"}`}
              onClick={() => setMode("publisher")}
            >
              Publisher access code
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${mode === "admin" ? "bg-white text-px-deep shadow-sm" : "text-black/60"}`}
              onClick={() => setMode("admin")}
            >
              Admin sign in
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "admin" ? (
              <>
                <label className="app-label">
                  Username
                  <input className="app-input" value={adminForm.username} onChange={(event) => setAdminForm((current) => ({ ...current, username: event.target.value }))} />
                </label>
                <label className="app-label">
                  Password
                  <input
                    className="app-input"
                    type="password"
                    value={adminForm.password}
                    onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="app-label">
                  Publisher access code
                  <input
                    className="app-input"
                    placeholder="Paste the shared publisher access code"
                    value={publisherForm.access_code}
                    onChange={(event) => setPublisherForm({ access_code: event.target.value })}
                  />
                </label>
                <p className="app-helper">
                  Each publisher has one shared access code for onboarding work. Reach out to your PX contact if you need the code rotated.
                </p>
              </>
            )}
            {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            <button className="app-button-primary w-full" disabled={loading}>
              {mode === "admin" ? "Sign in as admin" : "Open onboarding workspace"}
            </button>
          </form>
          <div className="mt-6 rounded-[1.4rem] border border-black/10 bg-px-cloud/70 p-5 text-sm leading-7 text-black/70">
            <strong className="block text-px-ink">Demo access</strong>
            <span className="mt-2 block">Admin: `admin` / `admin123`</span>
            <span className="block">Publisher code: `ACME-ACCESS-2026`</span>
          </div>
        </section>
      </div>
    </div>
  );
}
