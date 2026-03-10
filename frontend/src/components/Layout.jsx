import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const logoPath = "/px-logo.svg";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to={user?.role === "admin" ? "/admin" : "/"}>
          <span className="brand-mark">
            <img
              src={logoPath}
              alt="PX"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.parentElement.textContent = "PX";
              }}
            />
          </span>
          <div>
            <strong>Onboarding Wizard</strong>
            <span>Publisher coordination</span>
          </div>
        </Link>
        <nav className="nav">
          {user?.role === "admin" ? (
            <>
              <NavLink to="/admin">Publishers</NavLink>
              <NavLink to="/resources">Resources</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/resources">Resources</NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <span className="role-chip">{user?.role}</span>
          <button className="ghost-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
