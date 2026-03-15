import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

const AUTH_QUERY_KEY = ["auth", "user"] as const

export function useAuth() {
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      return user ?? null
    },
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [queryClient])

  const signOut = async () => {
    await supabase.auth.signOut()
    queryClient.setQueryData(AUTH_QUERY_KEY, null)
  }

  return { user: user ?? null, loading: isLoading, signOut }
}
