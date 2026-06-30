import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'

// ── constants ─────────────────────────────────────────────────────────────────

const ROLES = ['Homeowner', 'Co-owner', 'Architect', 'Subcontractor', 'Other']
const CATEGORIES = [
  { key: 'photos',   label: 'Before / After Photos', icon: '📷' },
  { key: 'permits',  label: 'Permits / Contracts',   icon: '📄' },
  { key: 'invoices', label: 'Invoices',               icon: '🧾' },
]
const ROLE_BADGE = {
  'Homeowner':     'bg-blue-100 text-blue-700',
  'Co-owner':      'bg-teal-100 text-teal-700',
  'Architect':     'bg-purple-100 text-purple-700',
  'Subcontractor': 'bg-amber-100 text-amber-700',
  'Other':         'bg-charcoal-100 text-charcoal-600',
}
const DEFAULT_SOP = [
  'Project Kickoff',
  'Permits Approved',
  'Demo Complete',
  'Mid-Project Check',
  'Inspections Passed',
  'Final Walkthrough',
  'Handoff & Punch List',
]

// ── helpers ───────────────────────────────────────────────────────────────────

function calcSchedule(project) {
  const today   = new Date()
  const start   = new Date(project.start_date)
  const end     = new Date(project.end_date)
  const total   = (end - start) / 86400000
  const elapsed = (today - start) / 86400000
  const expectedPct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0
  const actualPct   = project.actual_progress ?? 0
  const gap         = actualPct - expectedPct
  const gapDays     = Math.abs(Math.round((gap / 100) * total))
  const ahead       = gap >= 0
  return {
    actualPct, expectedPct,
    gapLabel: gapDays === 0 ? 'On track' : ahead ? `${gapDays}d ahead` : `${gapDays}d behind`,
    ahead, behindBy: ahead ? 0 : Math.abs(gap),
  }
}

function calcBudget(project) {
  const sched         = calcSchedule(project)
  const expectedSpend = (sched.expectedPct / 100) * (project.planned_budget ?? 0)
  const actualSpend   = project.amount_spent ?? 0
  const diff          = expectedSpend - actualSpend
  const absDiff       = Math.abs(Math.round(diff))
  const under         = diff >= 0
  const budgetPct     = project.planned_budget > 0
    ? Math.min(100, (actualSpend / project.planned_budget) * 100) : 0
  return {
    actualPct: budgetPct, expectedPct: sched.expectedPct,
    gapLabel: absDiff === 0 ? 'On budget' : under ? `$${absDiff.toLocaleString()} under` : `$${absDiff.toLocaleString()} over`,
    ahead: under, behindBy: under ? 0 : ((actualSpend - expectedSpend) / (project.planned_budget || 1)) * 100,
  }
}

// ── tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['Contacts', 'Files', 'Weekly Report', 'Send Update', 'SOP Checklist']

// ── main component ────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id }     = useParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [project,  setProject]  = useState(null)
  const [tab,      setTab]      = useState('Contacts')
  const [loading,  setLoading]  = useState(true)

  const loadProject = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).eq('contractor_id', user.id).single()
    if (!data) { navigate('/'); return }
    setProject(data)
    setLoading(false)
  }, [id, user.id, navigate])

  useEffect(() => { loadProject() }, [loadProject])

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const sched  = calcSchedule(project)
  const budget = calcBudget(project)

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Back */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-charcoal-500 hover:text-charcoal-700 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Projects
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-charcoal-900">{project.name}</h1>
            <p className="text-charcoal-500 text-sm mt-0.5">Client: {project.client_name}</p>
            <p className="text-charcoal-400 text-xs mt-0.5">
              {project.start_date} → {project.end_date} &nbsp;·&nbsp; Budget: ${Number(project.planned_budget).toLocaleString()}
            </p>
          </div>
          <span className="shrink-0 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Active
          </span>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide mb-2">Schedule</p>
            <ProgressBar {...sched} />
          </div>
          <div>
            <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide mb-2">Budget</p>
            <ProgressBar {...budget} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-charcoal-200 mb-6 gap-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'text-blue-600 bg-white border border-b-white border-charcoal-200 -mb-px'
                : 'text-charcoal-500 hover:text-charcoal-700 hover:bg-charcoal-50'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 p-6">
        {tab === 'Contacts'      && <ContactsTab project={project} user={user} />}
        {tab === 'Files'         && <FilesTab    project={project} user={user} />}
        {tab === 'Weekly Report' && <WeeklyReportTab project={project} user={user} onSaved={loadProject} />}
        {tab === 'Send Update'   && <SendUpdateTab   project={project} user={user} />}
        {tab === 'SOP Checklist' && <SOPTab          project={project} user={user} />}
      </div>
    </main>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACTS TAB
// ══════════════════════════════════════════════════════════════════════════════

function ContactsTab({ project, user }) {
  const [contacts,   setContacts]   = useState([])
  const [showModal,  setShowModal]  = useState(false)
  const [form,       setForm]       = useState({ name: '', email: '', phone: '', role: 'Homeowner', custom_role: '' })
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { load() }, [project.id])

  async function load() {
    const { data } = await supabase.from('contacts').select('*').eq('project_id', project.id).order('created_at')
    setContacts(data ?? [])
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('contacts').insert({ ...form, project_id: project.id, contractor_id: user.id })
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', email: '', phone: '', role: 'Homeowner', custom_role: '' })
    load()
  }

  async function remove(cid) {
    await supabase.from('contacts').delete().eq('id', cid)
    setContacts(c => c.filter(x => x.id !== cid))
  }

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-charcoal-900">Project Contacts</h2>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 border border-blue-300 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-charcoal-400 text-sm text-center py-10">No contacts yet. Add stakeholders to this project.</p>
      ) : (
        <div className="divide-y divide-charcoal-50">
          {contacts.map(c => (
            <div key={c.id} className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-charcoal-800">{c.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[c.role] ?? ROLE_BADGE.Other}`}>
                    {c.role === 'Other' && c.custom_role ? `Other — ${c.custom_role}` : c.role}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.email && <span className="text-xs text-charcoal-400">{c.email}</span>}
                  {c.phone && <span className="text-xs text-charcoal-400">{c.phone}</span>}
                </div>
              </div>
              <button onClick={() => remove(c.id)}
                className="text-charcoal-300 hover:text-red-400 transition-colors p-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Contact" onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Name</label>
              <input required value={form.name} onChange={set('name')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Role</label>
              <select value={form.role} onChange={set('role')}
                className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {form.role === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Custom Role Label</label>
                <input value={form.custom_role} onChange={set('custom_role')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Property Manager" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={set('email')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={set('phone')}
                  className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-charcoal-600 border border-charcoal-300 rounded-lg hover:bg-charcoal-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Add Contact
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FILES TAB
// ══════════════════════════════════════════════════════════════════════════════

function FilesTab({ project, user }) {
  const [files,      setFiles]      = useState([])
  const [uploading,  setUploading]  = useState(null)  // category key
  const [activeCategory, setActiveCategory] = useState('photos')

  useEffect(() => { loadFiles() }, [project.id])

  async function loadFiles() {
    const { data } = await supabase.from('project_files').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
    setFiles(data ?? [])
  }

  async function upload(e, category) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(category)
    const path = `${user.id}/${project.id}/${category}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('project-files').upload(path, file)
    if (!upErr) {
      await supabase.from('project_files').insert({
        project_id:    project.id,
        contractor_id: user.id,
        name:          file.name,
        category,
        storage_path:  path,
        file_type:     file.type,
        size:          file.size,
      })
      loadFiles()
    }
    setUploading(null)
    e.target.value = ''
  }

  async function deleteFile(f) {
    await supabase.storage.from('project-files').remove([f.storage_path])
    await supabase.from('project_files').delete().eq('id', f.id)
    setFiles(fs => fs.filter(x => x.id !== f.id))
  }

  async function openFile(f) {
    const { data } = await supabase.storage.from('project-files').createSignedUrl(f.storage_path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const byCategory = (key) => files.filter(f => f.category === key)

  return (
    <div>
      <h2 className="font-semibold text-charcoal-900 mb-4">Project Files</h2>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(cat => {
          const count = byCategory(cat.key).length
          return (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                activeCategory === cat.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-charcoal-50 text-charcoal-600 border-charcoal-200 hover:bg-charcoal-100'
              }`}>
              <span>{cat.icon}</span>
              {cat.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${activeCategory === cat.key ? 'bg-blue-500 text-white' : 'bg-charcoal-200 text-charcoal-600'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Upload button */}
      <label className={`inline-flex items-center gap-2 cursor-pointer text-sm font-medium px-4 py-2 rounded-lg border border-dashed border-charcoal-300 hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4 ${uploading === activeCategory ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading === activeCategory
          ? <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          : <svg className="w-4 h-4 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
        }
        {uploading === activeCategory ? 'Uploading…' : 'Upload File'}
        <input type="file" className="hidden" onChange={e => upload(e, activeCategory)} />
      </label>

      {/* File list */}
      {byCategory(activeCategory).length === 0 ? (
        <p className="text-charcoal-400 text-sm py-8 text-center">No files in this category yet.</p>
      ) : (
        <div className="divide-y divide-charcoal-50">
          {byCategory(activeCategory).map(f => (
            <div key={f.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-charcoal-100 rounded-lg flex items-center justify-center text-xs text-charcoal-500 font-mono uppercase">
                  {f.name.split('.').pop().slice(0, 4)}
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal-800 truncate max-w-xs">{f.name}</p>
                  <p className="text-xs text-charcoal-400">{(f.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openFile(f)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                  Open
                </button>
                <button onClick={() => deleteFile(f)} className="text-charcoal-300 hover:text-red-400 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// WEEKLY REPORT TAB
// ══════════════════════════════════════════════════════════════════════════════

const BLANK_REPORT = {
  week_summary: '', whats_next: '', delays: '',
  progress_percent: '', amount_spent: '', include_budget: false,
}

function WeeklyReportTab({ project, user, onSaved }) {
  const [form,       setForm]       = useState(BLANK_REPORT)
  const [generated,  setGenerated]  = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [history,    setHistory]    = useState([])
  const [genError,   setGenError]   = useState('')

  useEffect(() => { loadHistory() }, [project.id])

  async function loadHistory() {
    const { data } = await supabase.from('weekly_reports').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(5)
    setHistory(data ?? [])
  }

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) }

  async function generate(e) {
    e.preventDefault()
    setGenError('')
    setGenerating(true)
    setGenerated('')
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          projectName:     project.name,
          clientName:      project.client_name,
          weekSummary:     form.week_summary,
          whatsNext:       form.whats_next,
          delays:          form.delays,
          progressPercent: parseInt(form.progress_percent) || 0,
          amountSpent:     parseFloat(form.amount_spent) || 0,
          plannedBudget:   project.planned_budget,
          includeBudget:   form.include_budget,
        },
      })
      if (error) throw error
      setGenerated(data.report || '')
    } catch (err) {
      setGenError('Could not generate report. Check that the Edge Function is deployed and ANTHROPIC_API_KEY is set.')
    } finally {
      setGenerating(false)
    }
  }

  async function saveReport() {
    if (!generated) return
    setSaving(true)
    const pct   = parseInt(form.progress_percent) || 0
    const spent = parseFloat(form.amount_spent) || 0
    await supabase.from('weekly_reports').insert({
      project_id:       project.id,
      contractor_id:    user.id,
      week_summary:     form.week_summary,
      whats_next:       form.whats_next,
      delays:           form.delays,
      progress_percent: pct,
      amount_spent:     spent,
      include_budget:   form.include_budget,
      generated_report: generated,
    })
    // Update project progress + amount spent
    await supabase.from('projects').update({ actual_progress: pct, amount_spent: spent }).eq('id', project.id)
    setSaving(false)
    setForm(BLANK_REPORT)
    setGenerated('')
    loadHistory()
    onSaved()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-charcoal-900">Weekly Report Generator</h2>
        <span className="text-xs text-charcoal-400">Powered by Claude AI</span>
      </div>

      <form onSubmit={generate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1">What happened this week?</label>
          <textarea required rows={3} value={form.week_summary} onChange={set('week_summary')}
            className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Framing was completed on the east wing. Electrical rough-in started..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1">What's coming up next?</label>
          <textarea required rows={2} value={form.whats_next} onChange={set('whats_next')}
            className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Insulation install Monday, drywall delivery Thursday..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1">Any delays or issues?</label>
          <textarea rows={2} value={form.delays} onChange={set('delays')}
            className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Leave blank if none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">Current % Complete</label>
            <input required type="number" min="0" max="100" value={form.progress_percent} onChange={set('progress_percent')}
              className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="45" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">Amount Spent To Date ($)</label>
            <input required type="number" min="0" step="100" value={form.amount_spent} onChange={set('amount_spent')}
              className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="32500" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.include_budget} onChange={set('include_budget')}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm text-charcoal-700">Include budget summary in client report</span>
        </label>

        {genError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{genError}</div>
        )}

        <button type="submit" disabled={generating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60 transition-colors">
          {generating
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
            : '✦ Generate Report with AI'
          }
        </button>
      </form>

      {/* Generated report editor */}
      {generated && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-800">Generated Report — edit before saving</p>
          </div>
          <textarea
            value={generated}
            onChange={e => setGenerated(e.target.value)}
            rows={10}
            className="w-full border border-blue-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end">
            <button onClick={saveReport} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60 transition-colors">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Report & Update Progress
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-charcoal-600 mb-3">Recent Reports</h3>
          <div className="space-y-2">
            {history.map(r => (
              <div key={r.id} className="border border-charcoal-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-charcoal-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="text-xs font-semibold text-charcoal-600">{r.progress_percent}% complete · ${Number(r.amount_spent).toLocaleString()} spent</span>
                </div>
                <p className="text-sm text-charcoal-700 line-clamp-2">{r.generated_report}</p>
                {r.sent_at && (
                  <p className="text-xs text-emerald-600 mt-1">Sent {new Date(r.sent_at).toLocaleDateString()} to {(r.sent_to || []).length} contact(s)</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND UPDATE TAB
// ══════════════════════════════════════════════════════════════════════════════

function SendUpdateTab({ project, user }) {
  const [contacts,  setContacts]  = useState([])
  const [reports,   setReports]   = useState([])
  const [selected,  setSelected]  = useState({})   // {[contactId]: bool}
  const [activeRpt, setActiveRpt] = useState(null)
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)

  useEffect(() => {
    async function load() {
      const [c, r] = await Promise.all([
        supabase.from('contacts').select('*').eq('project_id', project.id).order('created_at'),
        supabase.from('weekly_reports').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(10),
      ])
      setContacts(c.data ?? [])
      setReports(r.data ?? [])
      if (r.data?.length) setActiveRpt(r.data[0])
    }
    load()
  }, [project.id])

  function toggle(id) {
    setSelected(s => ({ ...s, [id]: !s[id] }))
  }

  async function send() {
    if (!activeRpt) return
    const recipients = contacts.filter(c => selected[c.id]).map(c => ({ id: c.id, name: c.name }))
    if (recipients.length === 0) { alert('Select at least one recipient.'); return }
    setSending(true)
    await supabase.from('weekly_reports').update({
      sent_at: new Date().toISOString(),
      sent_to: recipients,
    }).eq('id', activeRpt.id)
    setSending(false)
    setSent(true)
    setSelected({})
    setTimeout(() => setSent(false), 4000)
  }

  if (reports.length === 0) return (
    <div className="text-center py-12">
      <p className="text-charcoal-500 text-sm">No reports generated yet. Go to the Weekly Report tab first.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-charcoal-900">Send Update to Client</h2>

      {/* Report selector */}
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-2">Select Report</label>
        <select
          value={activeRpt?.id ?? ''}
          onChange={e => setActiveRpt(reports.find(r => r.id === e.target.value))}
          className="w-full border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {reports.map(r => (
            <option key={r.id} value={r.id}>
              {new Date(r.created_at).toLocaleDateString()} — {r.progress_percent}% complete
            </option>
          ))}
        </select>
      </div>

      {/* Report preview */}
      {activeRpt && (
        <div className="bg-charcoal-50 rounded-xl p-4 text-sm text-charcoal-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-charcoal-100">
          {activeRpt.generated_report}
        </div>
      )}

      {/* Contact checklist */}
      <div>
        <p className="text-sm font-medium text-charcoal-700 mb-3">Send to (select recipients):</p>
        {contacts.length === 0 ? (
          <p className="text-sm text-charcoal-400">No contacts on this project. Add them in the Contacts tab.</p>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-charcoal-50 transition-colors">
                <input type="checkbox" checked={!!selected[c.id]} onChange={() => toggle(c.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <div>
                  <span className="text-sm font-medium text-charcoal-800">{c.name}</span>
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[c.role] ?? ROLE_BADGE.Other}`}>
                    {c.role}
                  </span>
                  {c.email && <span className="ml-2 text-xs text-charcoal-400">{c.email}</span>}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {sent && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 font-medium">
          ✓ Update logged as sent to selected contacts.
        </div>
      )}

      <button onClick={send} disabled={sending || !activeRpt}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60 transition-colors">
        {sending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        Send to Selected
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SOP CHECKLIST TAB
// ══════════════════════════════════════════════════════════════════════════════

function SOPTab({ project, user }) {
  const [items,    setItems]    = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [adding,   setAdding]   = useState(false)
  const [seeded,   setSeeded]   = useState(false)

  useEffect(() => { loadItems() }, [project.id])

  async function loadItems() {
    const { data } = await supabase.from('sop_items').select('*').eq('project_id', project.id).order('sort_order').order('created_at')
    const rows = data ?? []
    setItems(rows)
    // Auto-seed defaults on first load
    if (rows.length === 0 && !seeded) {
      setSeeded(true)
      const defaults = DEFAULT_SOP.map((title, i) => ({
        project_id: project.id, contractor_id: user.id, title, sort_order: i,
      }))
      await supabase.from('sop_items').insert(defaults)
      loadItems()
    }
  }

  async function toggle(item) {
    await supabase.from('sop_items').update({ completed: !item.completed }).eq('id', item.id)
    setItems(is => is.map(x => x.id === item.id ? { ...x, completed: !x.completed } : x))
  }

  async function addItem(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    await supabase.from('sop_items').insert({
      project_id: project.id, contractor_id: user.id,
      title: newTitle.trim(), sort_order: items.length,
    })
    setNewTitle('')
    setAdding(false)
    loadItems()
  }

  async function deleteItem(id) {
    await supabase.from('sop_items').delete().eq('id', id)
    setItems(is => is.filter(x => x.id !== id))
  }

  const done  = items.filter(i => i.completed).length
  const total = items.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-charcoal-900">SOP Checklist</h2>
        <span className="text-sm text-charcoal-400 font-medium">{done} / {total} complete</span>
      </div>

      {total > 0 && (
        <div className="w-full h-2 bg-charcoal-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      )}

      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${item.completed ? 'bg-emerald-50' : 'hover:bg-charcoal-50'}`}>
            <button onClick={() => toggle(item)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-charcoal-300 hover:border-emerald-400'
              }`}>
              {item.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`text-sm flex-1 ${item.completed ? 'line-through text-charcoal-400' : 'text-charcoal-800'}`}>
              {item.title}
            </span>
            <button onClick={() => deleteItem(item.id)} className="text-charcoal-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={addItem} className="flex gap-2 pt-2">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
          className="flex-1 border border-charcoal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add custom checklist item…" />
        <button type="submit" disabled={adding || !newTitle.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors">
          Add
        </button>
      </form>
    </div>
  )
}
