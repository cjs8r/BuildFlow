import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'

// ── helpers ──────────────────────────────────────────────────────────────────

function calcSchedule(project) {
  const today = new Date()
  const start = new Date(project.start_date)
  const end   = new Date(project.end_date)
  const total = (end - start) / 86400000          // total days
  const elapsed = (today - start) / 86400000       // days since start

  const expectedPct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0
  const actualPct   = project.actual_progress ?? 0
  const gap         = actualPct - expectedPct      // positive = ahead
  const gapDays     = Math.abs(Math.round((gap / 100) * total))
  const ahead       = gap >= 0

  return {
    actualPct,
    expectedPct,
    gapLabel: gapDays === 0
      ? 'On track'
      : ahead
        ? `${gapDays} day${gapDays !== 1 ? 's' : ''} ahead`
        : `${gapDays} day${gapDays !== 1 ? 's' : ''} behind`,
    ahead,
    behindBy: ahead ? 0 : Math.abs(gap),
  }
}

function calcBudget(project) {
  const schedule    = calcSchedule(project)
  const expectedSpend = (schedule.expectedPct / 100) * (project.planned_budget ?? 0)
  const actualSpend   = project.amount_spent ?? 0
  const diff          = expectedSpend - actualSpend   // positive = under budget
  const absDiff       = Math.abs(Math.round(diff))
  const under         = diff >= 0

  const budgetPct     = project.planned_budget > 0
    ? Math.min(100, (actualSpend / project.planned_budget) * 100)
    : 0

  return {
    actualPct:   budgetPct,
    expectedPct: schedule.expectedPct,
    gapLabel: absDiff === 0
      ? 'On budget'
      : under
        ? `$${absDiff.toLocaleString()} under`
        : `$${absDiff.toLocaleString()} over`,
    ahead:    under,
    behindBy: under ? 0 : ((actualSpend - expectedSpend) / (project.planned_budget || 1)) * 100,
  }
}

// ── component ─────────────────────────────────────────────────────────────────

const BLANK = { name: '', client_name: '', start_date: '', end_date: '', planned_budget: '' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  useEffect(() => { loadProjects() }, [user])

  async function loadProjects() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('contractor_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setProjects(data ?? [])
    setLoading(false)
  }

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function createProject(e) {
    e.preventDefault()
    setFormErr('')
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setFormErr('End date must be after start date.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('projects').insert({
      contractor_id:  user.id,
      name:           form.name.trim(),
      client_name:    form.client_name.trim(),
      start_date:     form.start_date,
      end_date:       form.end_date,
      planned_budget: parseFloat(form.planned_budget) || 0,
    })
    setSaving(false)
    if (error) { setFormErr(error.message); return }
    setShowModal(false)
    setForm(BLANK)
    loadProjects()
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Active Projects</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-charcoal-200 rounded-2xl">
          <div className="w-14 h-14 bg-charcoal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
          <p className="text-charcoal-600 font-medium">No projects yet</p>
          <p className="text-charcoal-400 text-sm mt-1">Click "New Project" to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-charcoal-50 border-b border-charcoal-100">
                <th className="text-left text-xs font-semibold text-charcoal-500 uppercase tracking-wider px-6 py-3 w-64">
                  Project / Client
                </th>
                <th className="text-left text-xs font-semibold text-charcoal-500 uppercase tracking-wider px-6 py-3">
                  Schedule
                </th>
                <th className="text-left text-xs font-semibold text-charcoal-500 uppercase tracking-wider px-6 py-3">
                  Budget
                </th>
                <th className="px-6 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-50">
              {projects.map(p => {
                const sched  = calcSchedule(p)
                const budget = calcBudget(p)
                return (
                  <tr key={p.id} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-charcoal-900 text-sm">{p.name}</p>
                      <p className="text-charcoal-400 text-xs mt-0.5">{p.client_name}</p>
                      <p className="text-charcoal-300 text-xs mt-0.5">
                        {p.start_date} → {p.end_date}
                      </p>
                    </td>
                    <td className="px-6 py-4 min-w-52">
                      <ProgressBar {...sched} />
                    </td>
                    <td className="px-6 py-4 min-w-52">
                      <ProgressBar {...budget} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                        View →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <Modal title="New Project" onClose={() => { setShowModal(false); setForm(BLANK); setFormErr('') }}>
          <form onSubmit={createProject} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Project Name</label>
                <input required value={form.name} onChange={set('name')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kitchen Remodel — 123 Main St" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Client Name</label>
                <input required value={form.client_name} onChange={set('client_name')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John & Mary Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Start Date</label>
                <input required type="date" value={form.start_date} onChange={set('start_date')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">End Date</label>
                <input required type="date" value={form.end_date} onChange={set('end_date')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Planned Budget ($)</label>
                <input required type="number" min="0" step="100" value={form.planned_budget} onChange={set('planned_budget')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="75000" />
              </div>
            </div>

            {formErr && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formErr}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button"
                onClick={() => { setShowModal(false); setForm(BLANK); setFormErr('') }}
                className="px-4 py-2 text-sm font-medium text-charcoal-600 border border-charcoal-300 rounded-lg hover:bg-charcoal-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 flex items-center gap-2 transition-colors">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Create Project
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  )
}
