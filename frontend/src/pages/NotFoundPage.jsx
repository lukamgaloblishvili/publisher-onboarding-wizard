import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="app-card max-w-xl">
      <h2 className="text-2xl font-semibold text-px-ink">Page not found</h2>
      <p className="mt-3 text-sm leading-7 text-black/65">This route is not part of the current onboarding workspace.</p>
      <Link className="app-button-secondary mt-5" to="/">
        Return home
      </Link>
    </div>
  );
}
