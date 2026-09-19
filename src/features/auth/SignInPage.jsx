import { useState } from "react"
import { Link, Navigate } from "react-router-dom"
import Button from "../../components/ui/Button"
import useAuth from "../../hooks/useAuth"

export default function SignInPage() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setSubmitting(true)
    const { error: signInError } = await signIn(email.trim(), password)
    if (signInError) setError(signInError.message)
    setSubmitting(false)
  }

  if (!loading && user) return <Navigate to="/" replace />
  return <main className="auth-page"><section className="auth-card"><div className="logo">TRIBE</div><h1>Welcome back</h1><p>Sign in to find your people.</p>
    <form onSubmit={handleSubmit} className="auth-form"><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="auth-error" role="alert">{error}</p>}<Button type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</Button></form>
    <p className="auth-switch">New to Tribe? <Link to="/signup">Create an account</Link></p>
  </section></main>
}
