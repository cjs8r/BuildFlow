import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIES = ['Billing question', 'Technical issue', 'Feature request', 'General question']

export default function Support() {
  const { user } = useAuth()
  const [form, setForm] = useState({ subject: '', category: 'Billing question', message: '', phone: '' })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error: err } = await supabase.from('support_messages').insert({
      contractor_id: user.id,
      subject:       form.subject,
      category:      form.category,
      message:       form.message,
      phone:         form.phone,
    })
    if (err) { setSaving(false); setError('Something went wrong. Please try again.'); return }

    // Notify CJ by email
    await supabase.functions.invoke('send-email', {
      body: {
        to:      'creighton.stater07@gmail.com',
        subject: `[BuildFlow Support] ${form.category}: ${form.subject}`,
        html: `
          <h2>New support message from a contractor</h2>
          <p><strong>Category:</strong> ${form.category}</p>
          <p><strong>Subject:</strong> ${form.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${form.message.replace(/\n/g, '<br/>')}</p>
          ${form.phone ? `<p><strong>Phone:</strong> ${form.phone}</p>` : ''}
          <hr/>
          <p><a href="https://buildflow-sand.vercel.app/admin">View in Admin Panel</a></p>
        `,
      },
    })

    setSaving(false)
    setSuccess(true)
    setForm({ subject: '', category: 'Billing question', message: '', phone: '' })
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-charcoal-900 mb-1">Contact & Support</h1>
      <p className="text-sm text-charcoal-500 mb-8">
        Have a question, billing issue, or feedback? Send a message and we'll get back to you.
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-8">
        {success ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">Message sent!</h2>
            <p className="text-charcoal-500 text-sm mb-6">We'll get back to you as soon as possible.</p>
            <button onClick={() => setSuccess(false)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Subject</label>
              <input required value={form.subject} onChange={set('subject')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief summary of your question" />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Category</label>
              <select value={form.category} onChange={set('category')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Message</label>
              <textarea required rows={5} value={form.message} onChange={set('message')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe your question or issue in detail..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Phone Number <span className="text-charcoal-400 font-normal">(optional — if you'd prefer a call back)</span>
              </label>
              <input type="tel" value={form.phone} onChange={set('phone')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 000-0000" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
            )}

            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60 transition-colors">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Send Message
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
