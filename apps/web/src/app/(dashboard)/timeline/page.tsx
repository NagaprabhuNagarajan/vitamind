'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Search,
  Plus,
  CheckCircle2,
  Trophy,
  Flame,
  Star,
  StickyNote,
  Trash2,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type EventType = 'task_completed' | 'goal_achieved' | 'habit_streak' | 'milestone' | 'note'

interface TimelineEvent {
  id: string
  user_id: string
  event_type: EventType
  title: string
  description: string | null
  event_date: string
  created_at: string
}

type FilterType = 'all' | 'tasks' | 'goals' | 'habits' | 'milestones' | 'notes'

const FILTER_TO_EVENT_TYPES: Record<FilterType, EventType[] | null> = {
  all: null,
  tasks: ['task_completed'],
  goals: ['goal_achieved'],
  habits: ['habit_streak'],
  milestones: ['milestone'],
  notes: ['note'],
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<EventType, { icon: typeof CheckCircle2; color: string; bgColor: string; borderColor: string }> = {
  task_completed: {
    icon: CheckCircle2,
    color: '#6366F1',
    bgColor: 'rgba(99,102,241,0.12)',
    borderColor: 'rgba(99,102,241,0.25)',
  },
  goal_achieved: {
    icon: Trophy,
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  habit_streak: {
    icon: Flame,
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  milestone: {
    icon: Star,
    color: '#A855F7',
    bgColor: 'rgba(168,85,247,0.12)',
    borderColor: 'rgba(168,85,247,0.25)',
  },
  note: {
    icon: StickyNote,
    color: '#06B6D4',
    bgColor: 'rgba(6,182,212,0.12)',
    borderColor: 'rgba(6,182,212,0.25)',
  },
}

const FILTER_CHIPS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'goals', label: 'Goals' },
  { key: 'habits', label: 'Habits' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'notes', label: 'Notes' },
]

const PAGE_SIZE = 20

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function groupByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {}
  for (const event of events) {
    const dateKey = event.event_date.slice(0, 10)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(event)
  }
  return groups
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Add-event form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState<'note' | 'milestone'>('note')
  const [newDate, setNewDate] = useState(todayISO())

  const fetchEvents = useCallback(
    async (page = 1, append = false) => {
      if (!append) setLoading(true)
      else setLoadingMore(true)

      try {
        let fetched: TimelineEvent[] = []

        if (searchQuery.trim()) {
          // Use the dedicated search endpoint
          const params = new URLSearchParams({
            q: searchQuery.trim(),
            limit: String(PAGE_SIZE),
          })
          const res = await fetch(`/api/v1/timeline/search?${params}`)
          const json = await res.json()
          fetched = json.data ?? []
        } else {
          // Use the paginated list endpoint
          const params = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE),
          })
          const eventTypes = FILTER_TO_EVENT_TYPES[activeFilter]
          if (eventTypes) {
            params.set('type', eventTypes[0])
          }
          const res = await fetch(`/api/v1/timeline?${params}`)
          const json = await res.json()
          fetched = json.data ?? []
        }

        if (append) {
          setEvents((prev) => [...prev, ...fetched])
        } else {
          setEvents(fetched)
        }
        setHasMore(fetched.length === PAGE_SIZE && !searchQuery.trim())
      } catch {
        // Silently handle fetch errors — events remain as-is
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeFilter, searchQuery],
  )

  // Re-fetch when filter or search changes
  useEffect(() => {
    setPage(1)
    fetchEvents(1, false)
  }, [fetchEvents])

  const [page, setPage] = useState(1)

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEvents(nextPage, true)
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          event_type: newType,
          event_date: newDate,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setEvents((prev) => [json.data, ...prev])
        resetForm()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(eventId: string) {
    setDeletingId(eventId)
    try {
      await fetch(`/api/v1/timeline/${eventId}`, { method: 'DELETE' })
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId))
    } finally {
      setDeletingId(null)
    }
  }

  function resetForm() {
    setNewTitle('')
    setNewDescription('')
    setNewType('note')
    setNewDate(todayISO())
    setShowAddForm(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const grouped = groupByDate(events)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Life Timeline</h1>
          <p className="text-xs text-text-tertiary mt-1">
            A chronicle of your progress and milestones
          </p>
        </div>
        <Clock className="w-5 h-5 text-text-tertiary" />
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_CHIPS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                activeFilter === key
                  ? {
                      background: 'rgba(99,102,241,0.2)',
                      border: '1px solid rgba(99,102,241,0.4)',
                      color: '#A5B4FC',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#94A3B8',
                    }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-text-tertiary hover:text-text-secondary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Event toggle */}
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: showAddForm ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#A5B4FC',
            }}
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? 'Cancel' : 'Add Event'}
          </button>
        </div>
      </div>

      {/* Add Event form */}
      {showAddForm && (
        <form
          onSubmit={handleAddEvent}
          className="card p-5 space-y-4"
          style={{ borderColor: 'rgba(99,102,241,0.2)' }}
        >
          <p className="text-sm font-semibold text-text-primary">New Timeline Event</p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Event title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />

            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />

            <div className="flex items-center gap-3">
              {/* Event type dropdown */}
              <div className="relative flex-1">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'note' | 'milestone')}
                  className="w-full appearance-none px-3 py-2 rounded-lg text-sm text-text-primary outline-none cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <option value="note">Note</option>
                  <option value="milestone">Milestone</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>

              {/* Date picker */}
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm text-text-primary outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newTitle.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{
                background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#A5B4FC',
              }}
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Event'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 w-32 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="card p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-text-tertiary mx-auto" />
          <h3 className="text-base font-semibold text-text-primary">No events yet</h3>
          <p className="text-sm text-text-tertiary max-w-md mx-auto">
            Your life timeline will build automatically as you complete tasks, achieve goals,
            and maintain habit streaks.
          </p>
        </div>
      )}

      {/* Timeline */}
      {!loading && events.length > 0 && (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey} className="space-y-2">
              {/* Date header */}
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                  {formatDateHeader(dateKey)}
                </p>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Events for this date */}
              <div className="space-y-2 pl-1">
                {grouped[dateKey].map((event) => {
                  const config = EVENT_CONFIG[event.event_type]
                  const Icon = config.icon
                  const isDeletable = event.event_type === 'note' || event.event_type === 'milestone'

                  return (
                    <div
                      key={event.id}
                      className="card p-4 group transition-colors"
                      style={{ borderColor: `${config.color}10` }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: config.bgColor,
                            border: `1px solid ${config.borderColor}`,
                          }}
                        >
                          <Icon className="w-4.5 h-4.5" style={{ color: config.color, width: 18, height: 18 }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <p className="text-[10px] text-text-tertiary mt-1">
                            {formatTime(event.created_at)}
                          </p>
                        </div>

                        {/* Delete (only for user-created types) */}
                        {isDeletable && (
                          <button
                            onClick={() => handleDelete(event.id)}
                            disabled={deletingId === event.id}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                            title="Delete event"
                          >
                            {deletingId === event.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-red-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94A3B8',
                }}
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
