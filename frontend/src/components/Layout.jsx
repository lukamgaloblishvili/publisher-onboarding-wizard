import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

function navClassName({ isActive }) {
  return [
    "rounded-2xl px-4 py-3 text-sm font-medium transition",
    isActive ? "bg-px-mist text-px-deep" : "text-black/70 hover:bg-white/70 hover:text-px-deep"
  ].join(" ");
}

export function AppShell({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen">
        <header className="border-b border-black/10 bg-white/75 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link className="flex items-center gap-4" to="/">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm">
                <img
                  className="max-h-9 max-w-9 object-contain"
                  src="/px-logo.svg"
                  alt="PX"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    event.currentTarget.parentElement.textContent = "PX";
                  }}
                />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-px-ink">PX Onboarding Workspace</strong>
                <span className="text-sm text-black/60">Campaign launch coordination</span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              {user?.publisher_slug ? <span className="text-xs uppercase tracking-[0.16em] text-black/45">{user.publisher_slug}</span> : null}
              <button className="app-button-secondary" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-black/10 bg-white/70 px-5 py-6 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r">
        <Link className="flex items-center gap-4" to={user?.role === "admin" ? "/admin" : "/"}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm">
            <img
              className="max-h-10 max-w-10 object-contain"
              src="/px-logo.svg"
              alt="PX"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.parentElement.textContent = "PX";
              }}
            />
          </span>
          <div>
            <strong className="block text-sm font-semibold text-px-ink">PX Onboarding Workspace</strong>
            <span className="text-sm text-black/60">Campaign launch coordination</span>
          </div>
        </Link>
        <div className="mt-8 rounded-[1.4rem] border border-px-green/15 bg-px-mist/80 p-4 text-sm leading-6 text-black/70">
          This workspace is for onboarding and launch coordination only. It centralizes integration and compliance work but does not replace
          <a className="ml-1 font-semibold text-px-deep underline underline-offset-2" href="https://open.px.com/login" target="_blank" rel="noreferrer">
            open.px.com
          </a>
          .
        </div>
        <nav className="mt-8 flex flex-col gap-2">
          {user?.role === "admin" ? (
            <>
              <NavLink to="/admin" className={navClassName}>
                Publishers
              </NavLink>
              <NavLink to="/resources" className={navClassName}>
                Resources
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className={navClassName}>
                Dashboard
              </NavLink>
              <NavLink to="/resources" className={navClassName}>
                Resources
              </NavLink>
            </>
          )}
        </nav>
        <div className="mt-8 flex items-center gap-3">
          <span className="app-pill bg-px-accent/15 text-fuchsia-700 capitalize">{user?.role}</span>
          {user?.publisher_slug ? <span className="text-xs uppercase tracking-[0.16em] text-black/45">{user.publisher_slug}</span> : null}
        </div>
        <button className="app-button-secondary mt-6 w-full" onClick={handleLogout}>
          Sign out
        </button>
      </aside>
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
