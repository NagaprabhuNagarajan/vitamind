'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface AutomationRule {
  id: string
  name: string
  trigger_type: string
  action_type: string
  trigger_config: Record<string, unknown>
  action_config: Record<string, unknown>
  is_active: boolean
  last_triggered_at: string | null
}

interface LabelsMap { [key: string]: string }

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  habit_streak_broken: 'When a habit is missed today',
  task_overdue: 'When any task becomes overdue',
  goal_deadline_approaching: 'When a goal deadline is near',
  momentum_low: 'When momentum score drops',
  burnout_high: 'When burnout risk is high',
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  create_task: 'Auto-create a recovery task',
  send_notification: 'Send a push notification',
  webhook: 'POST to a webhook URL',
}

export function AutomationsView() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [triggerLabels, setTriggerLabels] = useState<LabelsMap>({})
  const [actionLabels, setActionLabels] = useState<LabelsMap>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    trigger_type: 'task_overdue',
    action_type: 'create_task',
    threshold: '40',
    task_title: '',
    notification_message: '',
    webhook_url: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/automations')
      const json = await res.json()
      if (json.data) {
        setRules(json.data.rules ?? [])
        setTriggerLabels(json.data.trigger_labels ?? {})
        setActionLabels(json.data.action_labels ?? {})
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(rule: AutomationRule) {
    await fetch(`/api/v1/automations/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rule.is_active }),
    })
    await load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/v1/automations/${id}`, { method: 'DELETE' })
    await load()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    setSubmitting(true)
    try {
      const trigger_config: Record<string, unknown> = {}
      const action_config: Record<string, unknown> = {}

      if (form.trigger_type === 'momentum_low') trigger_config.threshold = Number(form.threshold)
      if (form.trigger_type === 'burnout_high') trigger_config.threshold = Number(form.threshold)
      if (form.trigger_type === 'goal_deadline_approaching') trigger_config.days_ahead = Number(form.threshold)

      if (form.action_type === 'create_task') action_config.title = form.task_title || `Auto: ${form.name}`
      if (form.action_type === 'send_notification') action_config.message = form.notification_message || form.name
      if (form.action_type === 'webhook') action_config.url = form.webhook_url

      await fetch('/api/v1/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          trigger_type: form.trigger_type,
          action_type: form.action_type,
          trigger_config,
          action_config,
        }),
      })
      setShowForm(false)
      setForm({ name: '', trigger_type: 'task_overdue', action_type: 'create_task', threshold: '40', task_title: '', notification_message: '', webhook_url: '' })
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New automation
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : rules.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <Zap className="w-8 h-8 mx-auto text-text-tertiary" />
          <p className="text-text-primary font-medium">No automations yet</p>
          <p className="text-text-secondary text-sm">Create a rule to automatically trigger actions when conditions in your life change.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 flex-shrink-0 ${rule.is_active ? 'text-primary' : 'text-text-tertiary'}`} />
                    <p className="font-medium text-text-primary text-sm truncate">{rule.name}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary">
                      {TRIGGER_DESCRIPTIONS[rule.trigger_type] ?? rule.trigger_type}
                    </span>
                    <span className="text-xs text-text-tertiary">→</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary">
                      {ACTION_DESCRIPTIONS[rule.action_type] ?? rule.action_type}
                    </span>
                  </div>
                  {rule.last_triggered_at && (
                    <p className="text-xs text-text-tertiary mt-1">
                      Last fired: {new Date(rule.last_triggered_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(rule)} className="btn-ghost p-1">
                    {rule.is_active
                      ? <ToggleRight className="w-5 h-5 text-primary" />
                      : <ToggleLeft className="w-5 h-5 text-text-tertiary" />}
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="btn-ghost p-1 text-text-tertiary hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create rule modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text-primary">New automation</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Name</label>
                <input required placeholder="e.g. Overdue task reminder" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Trigger</label>
                <select value={form.trigger_type} onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))} className="input">
                  {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {['momentum_low', 'burnout_high', 'goal_deadline_approaching'].includes(form.trigger_type) && (
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">
                    {form.trigger_type === 'goal_deadline_approaching' ? 'Days ahead' : 'Threshold'}
                  </label>
                  <input type="number" min="1" max="100" value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} className="input" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Action</label>
                <select value={form.action_type} onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))} className="input">
                  {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {form.action_type === 'create_task' && (
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Task title</label>
                  <input placeholder="Recovery task title" value={form.task_title} onChange={(e) => setForm((f) => ({ ...f, task_title: e.target.value }))} className="input" />
                </div>
              )}
              {form.action_type === 'send_notification' && (
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Notification message</label>
                  <input placeholder="Message to send" value={form.notification_message} onChange={(e) => setForm((f) => ({ ...f, notification_message: e.target.value }))} className="input" />
                </div>
              )}
              {form.action_type === 'webhook' && (
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Webhook URL</label>
                  <input type="url" placeholder="https://..." value={form.webhook_url} onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))} className="input" />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <Spinner size="sm" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
