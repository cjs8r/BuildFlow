import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'

const STATUS_COLOR = {
  paid:    'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
}

export default function Admin() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [contractors, setContractors] = useState([])
  const [selected,    setSelected]    = useState(null)
  const [projects,    setProjects]    = useState([])
  const [invoices,    setInvoices]    = useState([])
  const [messages,    setMessages]    = useState([])
  const [loading,     setLoading]     = useState(true)

  // Modals
  const [showInvoice,  setShowInvoice]  = useState(false)
  const [showMessage,  setShowMessage]  = useState(false)
  const [showPrice,    setShowPrice]    = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(null)  // 'suspend' | 'delete'

  // Forms
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', description: '', type: 'one_time', due_date: '', stripe_payment_url: '' })
  const [messageText, setMessageText] = useState('')
  const [priceForm,   setPriceForm]   = useState({ plan_name: '', plan_price: '' })
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (profile && !profile.is_admin) navigate('/')
  }, [profile, navigate])

  useEffect(() => { loadContractors() }, [])

  async function loadContractors() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*, projects(count)')
      .eq('is_admin', false)
      .order('created_at', { ascending: false })
    setContractors(data ?? [])
    setLoading(false)
  }

  async function selectContractor(c) {
    setSelected(c)
    const [p, inv, msg] = await Promise.all([
      supabase.from('projects').select('*').eq('contractor_id', c.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('contractor_id', c.id).order('created_at', { ascending: false }),
      supabase.from('support_messages').select('*').eq('contractor_id', c.id).order('created_at', { ascending: false }),
    ])
    setProjects(p.data ?? [])
    setInvoices(inv.data ?? [])
    setMessages(msg.data ?? [])
    // Mark messages as read
    await supabase.from('support_messages').update({ read: true }).eq('contractor_id', c.id).eq('read', false)
  }

  async function sendInvoice(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('invoices').insert({
      contractor_id:      selected.id,
      created_by:         profile.id,
      amount:             parseFloat(invoiceForm.amount),
      description:        invoiceForm.description,
      type:               invoiceForm.type,
      due_date:           invoiceForm.due_date || null,
      stripe_payment_url: invoiceForm.stripe_payment_url,
      status:             'pending',
    })
    setSaving(false)
    setShowInvoice(false)
    setInvoiceForm({ amount: '', description: '', type: 'one_time', due_date: '', stripe_payment_url: '' })
    selectContractor(selected)
  }

  async function sendMessage(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('support_messages').insert({
      contractor_id: selected.id,
      subject:       'Message from BuildFlow Admin',
      category:      'General question',
      message:       messageText,
      phone:         '',
    })
    setSaving(false)
    setShowMessage(false)
    setMessageText('')
    selectContractor(selected)
  }

  async function savePrice(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update({
      plan_name:  priceForm.plan_name,
      plan_price: parseFloat(priceForm.plan_price) || null,
    }).eq('id', selected.id)
    setSaving(false)
    setShowPrice(false)
    setSelected(s => ({ ...s, plan_name: priceForm.plan_name, plan_price: parseFloat(priceForm.plan_price) }))
    loadContractors()
  }

  async function toggleSuspend() {
    const next = !selected.suspended
    await supabase.from('profiles').update({ suspended: next }).eq('id', selected.id)
    setSelected(s => ({ ...s, suspended: next }))
    setContractors(cs => cs.map(c => c.id === selected.id ? { ...c, suspended: next } : c))
    setShowConfirm(null)
  }

  async function deleteContractor() {
    await supabase.from('profiles').delete().eq('id', selected.id)
    setContractors(cs => cs.filter(c => c.id !== selected.id))
    setSelected(null)
    setShowConfirm(null)
  }

  const unreadCount = (cid) => {
    // shown in contractor row — would need separate query; skip for perf
    return 0
  }

  if (!profile?.is_admin) return null

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Admin Panel</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{contractors.length} contractor{contractors.length !== 1 ? 's' : ''} on BuildFlow</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Contractor list */}
        <div className="col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-charcoal-100 bg-charcoal-50">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Contractors</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : contractors.length === 0 ? (
              <p className="text-center text-charcoal-400 text-sm py-10">No contractors yet.</p>
            ) : (
              <div className="divide-y divide-charcoal-50">
                {contractors.map(c => (
                  <button key={c.id} onClick={() => selectContractor(c)}
                    className={`w-full text-left px-4 py-3 hover:bg-charcoal-50 transition-colors ${selected?.id === c.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal-800 truncate">{c.name || 'No name'}</p>
                        <p className="text-xs text-charcoal-400 truncate">{c.email}</p>
                        {c.company_name && <p className="text-xs text-charcoal-400 truncate">{c.company_name}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {c.suspended && (
                          <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">Suspended</span>
                        )}
                        {c.plan_price && (
                          <span className="text-xs text-charcoal-400">${Number(c.plan_price).toLocaleString()}/mo</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contractor detail */}
        <div className="col-span-8">
          {!selected ? (
            <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 flex items-center justify-center h-64">
              <p className="text-charcoal-400 text-sm">Select a contractor to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-charcoal-900">{selected.name || 'Unnamed'}</h2>
                    <p className="text-sm text-charcoal-500">{selected.email}</p>
                    {selected.company_name && <p className="text-sm text-charcoal-400">{selected.company_name}</p>}
                    {selected.last_seen_at && (
                      <p className="text-xs text-charcoal-300 mt-1">Last seen {new Date(selected.last_seen_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {selected.plan_price
                      ? <p className="text-lg font-bold text-charcoal-900">${Number(selected.plan_price).toLocaleString()}<span className="text-sm font-normal text-charcoal-400">/mo</span></p>
                      : <p className="text-sm text-charcoal-400">No plan set</p>
                    }
                    {selected.plan_name && <p className="text-xs text-charcoal-400">{selected.plan_name}</p>}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length },
                    { label: 'Invoices Sent', value: invoices.length },
                    { label: 'Messages', value: messages.length },
                  ].map(s => (
                    <div key={s.label} className="bg-charcoal-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-charcoal-900">{s.value}</p>
                      <p className="text-xs text-charcoal-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setPriceForm({ plan_name: selected.plan_name || '', plan_price: selected.plan_price || '' }); setShowPrice(true) }}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Set Plan Price
                  </button>
                  <button onClick={() => setShowInvoice(true)}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition-colors">
                    Send Invoice
                  </button>
                  <button onClick={() => setShowMessage(true)}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-charcoal-300 text-charcoal-700 rounded-lg hover:bg-charcoal-50 transition-colors">
                    Message
                  </button>
                  <button onClick={() => setShowConfirm('suspend')}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors border ${
                      selected.suspended
                        ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                    }`}>
                    {selected.suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button onClick={() => setShowConfirm('delete')}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>

              {/* Projects */}
              <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-5">
                <h3 className="font-semibold text-charcoal-800 mb-3">Projects ({projects.length})</h3>
                {projects.length === 0 ? (
                  <p className="text-sm text-charcoal-400">No projects yet.</p>
                ) : (
                  <div className="space-y-2">
                    {projects.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-charcoal-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-charcoal-800">{p.name}</p>
                          <p className="text-xs text-charcoal-400">{p.client_name} · {p.start_date} → {p.end_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-charcoal-700">{p.actual_progress}% done</p>
                          <p className="text-xs text-charcoal-400">${Number(p.amount_spent).toLocaleString()} spent</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-5">
                <h3 className="font-semibold text-charcoal-800 mb-3">Invoices ({invoices.length})</h3>
                {invoices.length === 0 ? (
                  <p className="text-sm text-charcoal-400">No invoices sent yet.</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b border-charcoal-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-charcoal-800">{inv.description}</p>
                          <p className="text-xs text-charcoal-400">{inv.type === 'recurring' ? 'Recurring' : 'One-time'} · {new Date(inv.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status]}`}>{inv.status}</span>
                          <span className="text-sm font-bold text-charcoal-900">${Number(inv.amount).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Support messages */}
              <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-5">
                <h3 className="font-semibold text-charcoal-800 mb-3">Messages ({messages.length})</h3>
                {messages.length === 0 ? (
                  <p className="text-sm text-charcoal-400">No messages from this contractor.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map(m => (
                      <div key={m.id} className="border border-charcoal-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-charcoal-800">{m.subject}</p>
                          <span className="text-xs bg-charcoal-100 text-charcoal-500 px-2 py-0.5 rounded-full">{m.category}</span>
                        </div>
                        <p className="text-sm text-charcoal-600">{m.message}</p>
                        {m.phone && <p className="text-xs text-charcoal-400 mt-1">Phone: {m.phone}</p>}
                        <p className="text-xs text-charcoal-300 mt-1">{new Date(m.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Invoice Modal */}
      {showInvoice && (
        <Modal title={`Send Invoice to ${selected?.name}`} onClose={() => setShowInvoice(false)}>
          <form onSubmit={sendInvoice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Amount ($)</label>
              <input required type="number" min="1" step="0.01" value={invoiceForm.amount}
                onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="199.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Description</label>
              <input required value={invoiceForm.description}
                onChange={e => setInvoiceForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="BuildFlow monthly access — July 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Type</label>
                <select value={invoiceForm.type} onChange={e => setInvoiceForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="one_time">One-time</option>
                  <option value="recurring">Recurring</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Due Date</label>
                <input type="date" value={invoiceForm.due_date}
                  onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Stripe Payment Link <span className="text-charcoal-400 font-normal">(optional — paste from Stripe dashboard)</span></label>
              <input type="url" value={invoiceForm.stripe_payment_url}
                onChange={e => setInvoiceForm(f => ({ ...f, stripe_payment_url: e.target.value }))}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://buy.stripe.com/..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowInvoice(false)}
                className="px-4 py-2 text-sm font-medium text-charcoal-600 border border-charcoal-300 rounded-lg hover:bg-charcoal-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Send Invoice
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Message Modal */}
      {showMessage && (
        <Modal title={`Message ${selected?.name}`} onClose={() => setShowMessage(false)}>
          <form onSubmit={sendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Message</label>
              <textarea required rows={5} value={messageText} onChange={e => setMessageText(e.target.value)}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Hi! Just wanted to check in..." />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowMessage(false)}
                className="px-4 py-2 text-sm font-medium text-charcoal-600 border border-charcoal-300 rounded-lg hover:bg-charcoal-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Send Message
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Set Plan Price Modal */}
      {showPrice && (
        <Modal title={`Set Plan for ${selected?.name}`} onClose={() => setShowPrice(false)}>
          <form onSubmit={savePrice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Plan Name</label>
              <input value={priceForm.plan_name} onChange={e => setPriceForm(f => ({ ...f, plan_name: e.target.value }))}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Starter, Pro, Custom" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Monthly Price ($)</label>
              <input type="number" min="0" step="1" value={priceForm.plan_price}
                onChange={e => setPriceForm(f => ({ ...f, plan_price: e.target.value }))}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="79" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowPrice(false)}
                className="px-4 py-2 text-sm font-medium text-charcoal-600 border border-charcoal-300 rounded-lg hover:bg-charcoal-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <Modal title={showConfirm === 'delete' ? 'Delete Account' : selected?.suspended ? 'Unsuspend Account' : 'Suspend Account'}
          onClose={() => setShowConfirm(null)}>
          <p className="text-sm text-charcoal-600 mb-6">
            {showConfirm === 'delete'
              ? `This will permanently delete ${selected?.name}'s account and all their data. This cannot be undone.`
              : selected?.suspended
                ? `This will restore ${selected?.name}'s access to BuildFlow.`
                : `This will lock ${selected?.name} out of BuildFlow until you unsuspend them.`
            }
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowConfirm(null)}
              className="px-4 py-2 text-sm font-medium text-charcoal-600 border border-charcoal-300 rounded-lg hover:bg-charcoal-50">Cancel</button>
            <button onClick={showConfirm === 'delete' ? deleteContractor : toggleSuspend}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                showConfirm === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
              }`}>
              {showConfirm === 'delete' ? 'Delete permanently' : selected?.suspended ? 'Unsuspend' : 'Suspend'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
