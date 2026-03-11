import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      return supabase.auth.signInWithPassword({ email, password })
    },
    []
  )

  const handleSignUp = useCallback(
    async (email: string, password: string) => {
      return supabase.auth.signUp({ email, password })
    },
    []
  )

  const handleSignOut = useCallback(async () => {
    return supabase.auth.signOut()
  }, [])

  return {
    user,
    session,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  }
}
