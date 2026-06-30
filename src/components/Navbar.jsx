import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  const active = (path) =>
    location.pathname === path
      ? 'text-white border-b-2 border-blue-400 pb-0.5'
      : 'text-charcoal-300 hover:text-white transition-colors'

  const isAdmin = profile?.is_admin

  return (
    <nav className="bg-charcoal-900 border-b border-charcoal-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-14 gap-8">
        {/* Logo */}
        <Link to={isAdmin ? '/admin' : '/'} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-white font-bold tracking-tight text-base">BuildFlow</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6 text-sm font-medium">
          {isAdmin ? (
            <>
              <Link to="/admin"    className={active('/admin')}>Admin Panel</Link>
              <Link to="/settings" className={active('/settings')}>Settings</Link>
            </>
          ) : (
            <>
              <Link to="/"         className={active('/')}>Dashboard</Link>
              <Link to="/billing"  className={active('/billing')}>Billing</Link>
              <Link to="/support"  className={active('/support')}>Support</Link>
              <Link to="/settings" className={active('/settings')}>Settings</Link>
            </>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User avatar */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)}
            className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-blue-500 transition-colors">
            {initials}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-charcoal-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-charcoal-100">
                <p className="text-sm font-semibold text-charcoal-800">{profile?.name || 'Contractor'}</p>
                <p className="text-xs text-charcoal-500 truncate">{profile?.email}</p>
                {profile?.company_name && (
                  <p className="text-xs text-charcoal-400 mt-0.5">{profile.company_name}</p>
                )}
                {isAdmin && (
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Admin</span>
                )}
              </div>
              <button onClick={handleSignOut}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
