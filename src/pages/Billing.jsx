import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STATUS_COLOR = {
  paid:    'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
}

const STATUS_LABEL = {
  paid:    'Paid',
  pending: 'Due',
  overdue: 'Overdue',
}

export default function Billing() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [paying,   setPaying]   = useState(null)
  const justPaid = new URLSearchParams(location.search).get('paid') === 'true'

  useEffect(() => { load() }, [user])

  async function handlePay(inv) {
    setPaying(inv.id)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          invoice_id:        inv.id,
          amount:            Number(inv.amount),
          description:       inv.description,
          contractor_email:  profile.email,
          origin:            window.location.origin,
        },
      })
      if (error || !data?.url) throw new Error('Failed to create checkout session')
      window.location.href = data.url
    } catch (err) {
      alert('Payment setup failed. Please try again.')
      setPaying(null)
    }
  }

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false })
    setInvoices(data ?? [])
    setLoading(false)
  }

  const outstanding = invoices.filter(i => i.status !== 'paid')
  const paid        = invoices.filter(i => i.status === 'paid')
  const totalOwed   = outstanding.reduce((sum, i) => sum + Number(i.amount), 0)

  // Next billing date: earliest due_date among pending/overdue
  const nextDue = outstanding
    .filter(i => i.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0]?.due_date

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-charcoal-900 mb-1">Billing</h1>
      <p className="text-sm text-charcoal-500 mb-8">Your invoices and payment history.</p>

      {justPaid && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-emerald-800">Payment successful! Your invoice has been marked as paid.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-5">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide mb-1">Current Plan</p>
              <p className="text-lg font-bold text-charcoal-900">
                {profile?.plan_price
                  ? `$${Number(profile.plan_price).toLocaleString()}/mo`
                  : '—'
                }
              </p>
              {profile?.plan_name && (
                <p className="text-xs text-charcoal-400 mt-0.5">{profile.plan_name}</p>
              )}
            </div>

            <div className={`bg-white rounded-2xl shadow-sm border p-5 ${totalOwed > 0 ? 'border-amber-200' : 'border-charcoal-100'}`}>
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide mb-1">Amount Due</p>
              <p className={`text-lg font-bold ${totalOwed > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {totalOwed > 0 ? `$${totalOwed.toLocaleString()}` : 'All paid'}
              </p>
              <p className="text-xs text-charcoal-400 mt-0.5">
                {outstanding.length} outstanding invoice{outstanding.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-5">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide mb-1">Next Due Date</p>
              <p className="text-lg font-bold text-charcoal-900">
                {nextDue ? new Date(nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </p>
              {nextDue && <p className="text-xs text-charcoal-400 mt-0.5">{new Date(nextDue).getFullYear()}</p>}
            </div>
          </div>

          {/* Outstanding invoices */}
          {outstanding.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-charcoal-100 bg-amber-50">
                <h2 className="font-semibold text-charcoal-900">Outstanding Invoices</h2>
              </div>
              <div className="divide-y divide-charcoal-50">
                {outstanding.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-charcoal-800">{inv.description}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-charcoal-400 capitalize">{inv.type === 'recurring' ? 'Recurring' : 'One-time'}</span>
                        {inv.due_date && (
                          <span className="text-xs text-charcoal-400">Due {new Date(inv.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                      <span className="text-base font-bold text-charcoal-900">${Number(inv.amount).toLocaleString()}</span>
                      <button onClick={() => handlePay(inv)} disabled={paying === inv.id}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                        {paying === inv.id && (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        Pay Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-charcoal-100">
              <h2 className="font-semibold text-charcoal-900">Payment History</h2>
            </div>
            {paid.length === 0 ? (
              <p className="text-center text-charcoal-400 text-sm py-10">No payments yet.</p>
            ) : (
              <div className="divide-y divide-charcoal-50">
                {paid.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-charcoal-800">{inv.description}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">
                        Paid {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Paid</span>
                      <span className="text-base font-bold text-charcoal-900">${Number(inv.amount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {invoices.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-charcoal-200 rounded-2xl">
              <p className="text-charcoal-500 font-medium">No invoices yet</p>
              <p className="text-charcoal-400 text-sm mt-1">Invoices from BuildFlow will appear here.</p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
