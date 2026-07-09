import { useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import AdminLayout from './AdminLayout'

const REMEMBER_ADMIN_EMAIL_KEY = 'rogers_admin_email'

export default function AdminLogin() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_ADMIN_EMAIL_KEY) || '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(localStorage.getItem(REMEMBER_ADMIN_EMAIL_KEY)))
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      if (!supabaseReady || !supabase) {
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      if (data.session) {
        await verifyAdminSession(data.session)
      } else {
        setLoading(false)
      }
    }

    const authListener = supabase?.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return

      if (nextSession) {
        await verifyAdminSession(nextSession)
      } else {
        setSession(null)
        setLoading(false)
      }
    })

    loadSession()

    return () => {
      mounted = false
      authListener?.data?.subscription?.unsubscribe()
    }
  }, [])

  async function verifyAdminSession(activeSession) {
    setErrorMsg('')
    setLoading(true)

    const { data, error } = await supabase.rpc('is_admin')

    if (error || data !== true) {
      await supabase.auth.signOut()
      setSession(null)
      setErrorMsg('This login is not authorized for the admin portal.')
      setLoading(false)
      return
    }

    setSession(activeSession)
    setLoading(false)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setErrorMsg('')

    if (!supabaseReady || !supabase) {
      setErrorMsg('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify.')
      return
    }

    setSigningIn(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    if (error) {
      setSigningIn(false)
      setErrorMsg(error.message)
      return
    }

    if (rememberEmail) {
      localStorage.setItem(REMEMBER_ADMIN_EMAIL_KEY, email.trim())
    } else {
      localStorage.removeItem(REMEMBER_ADMIN_EMAIL_KEY)
    }

    await verifyAdminSession(data.session)
    setSigningIn(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
    setPassword('')
  }

  if (loading) {
    return (
      <div className="adminLogin">
        <div className="loginCard">
          <h1>Roger's Tire -N- Auto</h1>
          <p className="adminSubtitle">Checking admin session...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return <AdminLayout adminEmail={session.user.email} onSignOut={handleSignOut} />
  }

  return (
    <div className="adminLogin">
      <form className="loginCard" onSubmit={handleSignIn}>
        <h1>Roger's Tire -N- Auto</h1>
        <p className="adminSubtitle">Admin Portal</p>

        {errorMsg && <div className="loginError">{errorMsg}</div>}

        <input
          type="email"
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className="rememberLogin">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
          />
          <span>Remember email on this device</span>
        </label>

        <button
          type="submit"
          className="btn primary adminButton"
          disabled={signingIn}
        >
          {signingIn ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
