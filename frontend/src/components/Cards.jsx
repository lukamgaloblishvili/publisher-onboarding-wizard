export function Card({ title, actions, children, className = "" }) {
  return (
    <section className={`app-card ${className}`}>
      {(title || actions) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          {title ? <h3 className="text-lg font-semibold text-px-ink">{title}</h3> : <span />}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
