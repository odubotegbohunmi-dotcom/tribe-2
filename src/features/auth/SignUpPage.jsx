import { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import Button from "../../components/ui/Button"
import useAuth from "../../hooks/useAuth"

export default function SignUpPage() {
  const { user, loading, signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", username: "", displayName: "" })
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function updateField(event) { setForm({ ...form, [event.target.name]: event.target.value }) }
  async function handleSubmit(event) {
    event.preventDefault()
    setError(""); setMessage("")
    if (!form.username.trim()) { setError("Username is required."); return }
    if (!form.displayName.trim()) { setError("Display name is required."); return }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return }
    setSubmitting(true)
    const { data, error: signUpError } = await signUp({ email: form.email.trim(), password: form.password, username: form.username.trim().toLowerCase(), displayName: form.displayName.trim() })
    if (signUpError) setError(signUpError.message)
    else if (data.session) navigate("/onboarding", { replace: true })
    else setMessage("Check your email to confirm your account, then sign in to finish setting up your profile.")
    setSubmitting(false)
  }

  if (!loading && user) return <Navigate to="/onboarding" replace />
  return <main className="auth-page"><section className="auth-card"><div className="logo">TRIBE</div><h1>Join your Tribe</h1><p>Create an account to get started.</p>
    <form onSubmit={handleSubmit} className="auth-form"><label>Display name<input name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" required /></label><label>Username<input name="username" value={form.username} onChange={updateField} autoComplete="username" required /></label><label>Email<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label><label>Password<input name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength="6" required /></label><label>Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" minLength="6" required /></label>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message">{message}</p>}<Button type="submit" disabled={submitting}>{submitting ? "Creating account..." : "Sign up"}</Button></form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </section></main>
}
