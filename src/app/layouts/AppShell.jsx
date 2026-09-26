import { ComposerProvider } from "../../context/ComposerContext"
import { useEffect, useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import Sidebar from "../../components/navigation/Sidebar"
import MobileNav from "../../components/navigation/MobileNav"
import LiveSessionProvider from "../../features/live/LiveSessionProvider"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user?.id) return

    void Promise.resolve().then(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .single()

      setProfile(data || null)
    })
  }, [user])

  async function handleSignOut() {
    const { error } = await signOut()

    if (!error) {
      navigate("/login", { replace: true })
    }
  }

  return (
    <ComposerProvider>
      <LiveSessionProvider>
        <div className="tribe-app">
          <Sidebar
            profile={profile}
            onSignOut={handleSignOut}
          />

          <main className="feed">
            <Outlet />
          </main>

          <MobileNav onSignOut={handleSignOut} />
        </div>
      </LiveSessionProvider>
    </ComposerProvider>
  )
}