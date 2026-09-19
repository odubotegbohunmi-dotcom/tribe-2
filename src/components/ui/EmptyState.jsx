export default function EmptyState({ icon = "✦", title, description, action }) {
  return (
    <section className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </section>
  )
}
