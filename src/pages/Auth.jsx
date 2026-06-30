import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab]         = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    email: '', password: '', name: '', company: '',
  })

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(form.email, form.password)
      } else {
        if (!form.name.trim()) throw new Error('Name is required.')
        await signUp(form.email, form.password, form.name, form.company)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">BuildFlow</span>
          </div>
          <p className="text-charcoal-400 text-sm">Project management for residential contractors</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-charcoal-200">
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-charcoal-500 hover:text-charcoal-700'
                }`}>
                {t === 'login' ? 'Log In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-8 space-y-4">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1">Full Name</label>
                  <input type="text" required value={form.name} onChange={set('name')}
                    className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1">Company Name</label>
                  <input type="text" value={form.company} onChange={set('company')}
                    className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Smith Construction LLC" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Email</label>
              <input type="email" required value={form.email} onChange={set('email')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Password</label>
              <input type="password" required minLength={6} value={form.password} onChange={set('password')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 6 characters" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {tab === 'login' ? 'Log In' : 'Create Account'}
            </button>

            {tab === 'signup' && (
              <p className="text-xs text-charcoal-400 text-center">
                By creating an account you agree to our terms of service.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
