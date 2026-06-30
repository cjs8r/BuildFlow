import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const [form,    setForm]    = useState({ name: '', email: '', company_name: '' })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (profile) setForm({ name: profile.name ?? '', email: profile.email ?? '', company_name: profile.company_name ?? '' })
  }, [profile])

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function save(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)
    const { error: err } = await supabase.from('profiles').update({
      name:         form.name.trim(),
      email:        form.email.trim(),
      company_name: form.company_name.trim(),
    }).eq('id', user.id)
    if (err) {
      setError(err.message)
    } else {
      await refreshProfile()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-charcoal-900 mb-1">Account Settings</h1>
      <p className="text-sm text-charcoal-500 mb-8">Update your profile information.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-8">
        <form onSubmit={save} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">Full Name</label>
            <input required value={form.name} onChange={set('name')}
              className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={set('email')}
              className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">Company Name</label>
            <input value={form.company_name} onChange={set('company_name')}
              className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Smith Construction LLC" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-3 py-2 font-medium">
              ✓ Profile updated successfully.
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60 transition-colors">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
