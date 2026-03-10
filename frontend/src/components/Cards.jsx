export function Card({ title, actions, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          {title ? <h3>{title}</h3> : <span />}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
