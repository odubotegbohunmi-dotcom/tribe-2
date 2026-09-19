import { useCallback, useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import ErrorState from "../../components/ui/ErrorState"
import Skeleton from "../../components/ui/Skeleton"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

export default function RequireAuth({ allowMissingProfile = false }) {
  const { user, loading } = useAuth()
  const [profileState, setProfileState] = useState("checking")
  const [error, setError] = useState("")

  const checkProfile = useCallback(async () => {
    if (!user || allowMissingProfile) return
    setProfileState("checking")
    setError("")
    const { data, error: profileError } = await supabase.from("profiles").select("id").eq("id", user.id)
    if (profileError) { setError(profileError.message); setProfileState("error"); return }
    setProfileState(data?.[0] ? "ready" : "missing")
  }, [allowMissingProfile, user])

  useEffect(() => {
    if (!user || allowMissingProfile) return
    void Promise.resolve().then(checkProfile)
  }, [checkProfile, user, allowMissingProfile])

  if (loading) return <div className="auth-loading"><Skeleton className="skeleton--text" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (allowMissingProfile) return <Outlet />
  if (profileState === "checking") return <div className="auth-loading"><Skeleton className="skeleton--text" /></div>
  if (profileState === "error") return <ErrorState title="Could not verify your profile" message={error} onRetry={checkProfile} />
  if (profileState === "missing") return <Navigate to="/onboarding" replace />
  return <Outlet />
}
