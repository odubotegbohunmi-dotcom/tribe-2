import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { AuthContext } from "./authContext"

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    const { data: sessionData } = await supabase.auth.getSession()
    const { data: userData, error } = await supabase.auth.getUser()

    if (error) {
      setSession(null)
      setUser(null)

      return {
        user: null,
        error,
      }
    }

    setSession(sessionData.session)
    setUser(userData.user)

    return {
      user: userData.user,
      error: null,
    }
  }

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      const { data, error } = await supabase.auth.getSession()

      if (!active) return

      if (error) {
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }

      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    void initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return

        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        setLoading(false)
      },
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  async function signUp({
    email,
    password,
    username,
    displayName,
  }) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
        },

        emailRedirectTo: "http://10.0.0.205:5173/onboarding",
      },
    })
  }

  async function signOut() {
    const result = await supabase.auth.signOut()

    if (!result.error) {
      setSession(null)
      setUser(null)
    }

    return result
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}