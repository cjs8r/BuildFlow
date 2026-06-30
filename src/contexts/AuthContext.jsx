import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null)
  const [profile,       setProfile]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [profileReady,  setProfileReady]  = useState(false)

  async function loadProfile(userId) {
    setProfileReady(false)
    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setProfile(data)
        setProfileReady(true)
        return
      }

      if (!error) {
        await new Promise(r => setTimeout(r, 500))
      } else {
        break
      }
    }
    setProfileReady(true)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).then(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
          setProfileReady(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password, name, companyName) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({
        id:           data.user.id,
        email,
        name:         name || '',
        company_name: companyName || '',
      })
    }
    return data
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setProfileReady(false)
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileReady, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx)    throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
