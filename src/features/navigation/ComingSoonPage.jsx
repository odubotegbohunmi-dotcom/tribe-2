import { Link } from "react-router-dom"

export default function ComingSoonPage({ title, icon = "✦", message }) {
  return (
    <main className="v1-placeholder-page">
      <section className="v1-placeholder-card">
        <span className="v1-placeholder-icon" aria-hidden="true">{icon}</span>
        <p className="v1-eyebrow">TRIBE · IN DEVELOPMENT</p>
        <h1>{title}</h1>
        <p>{message || "This destination is being prepared. No actions are available here yet."}</p>
        <Link className="v1-outline-button" to="/tribes">Back to Tribes</Link>
      </section>
    </main>
  )
}
