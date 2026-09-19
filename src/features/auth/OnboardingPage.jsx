import { useCallback, useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import Skeleton from "../../components/ui/Skeleton"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [existingProfile, setExistingProfile] = useState(false)
  const [form, setForm] = useState({ username: user?.user_metadata?.username || "", displayName: user?.user_metadata?.display_name || "", bio: "" })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const checkExistingProfile = useCallback(async () => {
    if (!user) return
    setChecking(true)
    setError("")
    const { data, error: profileError } = await supabase.from("profiles").select("id").eq("id", user.id)
    if (profileError) setError(profileError.message)
    else setExistingProfile(Boolean(data?.[0]))
    setChecking(false)
  }, [user])

  useEffect(() => { void Promise.resolve().then(checkExistingProfile) }, [checkExistingProfile])

  function updateField(event) { setForm({ ...form, [event.target.name]: event.target.value }) }
  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    if (!form.username.trim()) { setError("Username is required."); return }
    if (!form.displayName.trim()) { setError("Display name is required."); return }
    setSubmitting(true)
    const { error: createError } = await supabase.from("profiles").insert({ id: user.id, username: form.username.trim().toLowerCase(), display_name: form.displayName.trim(), bio: form.bio.trim(), avatar_url: null })
    if (createError) { setError(createError.message); setSubmitting(false); return }
    navigate("/", { replace: true })
  }

  if (!user) return <Navigate to="/login" replace />
  if (checking) return <main className="auth-page"><Skeleton className="skeleton--text" /></main>
  if (existingProfile) return <Navigate to="/" replace />
  return <main className="auth-page"><section className="auth-card"><div className="logo">TRIBE</div><h1>Finish your profile</h1><p>Choose how your Tribe will know you.</p>
    {error && <ErrorState title="Could not create your profile" message={error} onRetry={checkExistingProfile} />}
    <form onSubmit={handleSubmit} className="auth-form"><label>Display name<input name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" required /></label><label>Username<input name="username" value={form.username} onChange={updateField} autoComplete="username" required /></label><label>Bio <span>(optional)</span><textarea name="bio" value={form.bio} onChange={updateField} placeholder="Tell your Tribe a little about yourself" /></label><Button type="submit" disabled={submitting}>{submitting ? "Creating profile..." : "Continue to Tribe"}</Button></form>
  </section></main>
}
