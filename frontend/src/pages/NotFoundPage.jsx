import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="empty-state">
      <h2>Page not found</h2>
      <Link to="/">Return home</Link>
    </div>
  );
}
