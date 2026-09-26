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

    const { error: signInError } =
      await signIn(email.trim(), password)

    if (signInError) {
      setError(signInError.message)
    }

    setSubmitting(false)
  }

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">T</div>

          <div>
            <strong>TRIBE</strong>
            <span>Find your people</span>
          </div>
        </div>

        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Sign in and get back to your communities.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>

          {error && (
            <p
              className="auth-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Signing in..."
              : "Sign in"}
          </Button>
        </form>

        <div className="auth-divider">
          <span />
          <p>or</p>
          <span />
        </div>

        <p className="auth-switch">
          New to Tribe?{" "}
          <Link to="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  )
}