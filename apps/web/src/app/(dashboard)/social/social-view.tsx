'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, CheckCircle2, Trash2, AlertCircle, TrendingUp, Target } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { SocialConnection, FriendActivity } from '@/features/social/services/social.service'

export function SocialView() {
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [feed, setFeed] = useState<FriendActivity[]>([])
  const [loadingConns, setLoadingConns] = useState(true)
  const [loadingFeed, setLoadingFeed] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    void fetchConnections()
    void fetchFeed()
  }, [])

  async function fetchConnections() {
    setLoadingConns(true)
    try {
      const res = await fetch('/api/v1/social/friends')
      const { data } = await res.json()
      setConnections((data as SocialConnection[]) ?? [])
    } catch { /* silent */ } finally {
      setLoadingConns(false)
    }
  }

  async function fetchFeed() {
    setLoadingFeed(true)
    try {
      const res = await fetch('/api/v1/social/feed')
      const { data } = await res.json()
      setFeed((data as FriendActivity[]) ?? [])
    } catch { /* silent */ } finally {
      setLoadingFeed(false)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteResult(null)
    try {
      const res = await fetch('/api/v1/social/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const { data } = await res.json()
      setInviteResult(data as { ok: boolean; message: string })
      if ((data as { ok: boolean }).ok) { setInviteEmail(''); void fetchConnections() }
    } catch { setInviteResult({ ok: false, message: 'Failed to send invite' }) }
    finally { setInviting(false) }
  }

  async function acceptInvite(id: string) {
    setActionId(id)
    try {
      await fetch(`/api/v1/social/friends/${id}`, { method: 'PUT' })
      void fetchConnections(); void fetchFeed()
    } catch { /* silent */ } finally { setActionId(null) }
  }

  async function removeConnection(id: string) {
    setActionId(id)
    try {
      await fetch(`/api/v1/social/friends/${id}`, { method: 'DELETE' })
      setConnections((prev) => prev.filter((c) => c.id !== id))
      setFeed((prev) => prev.filter((f) => {
        const removed = connections.find((c) => c.id === id)
        return f.friend_id !== removed?.friend_id
      }))
    } catch { /* silent */ } finally { setActionId(null) }
  }

  const accepted = connections.filter((c) => c.status === 'accepted')
  const incoming = connections.filter((c) => c.status === 'pending' && c.direction === 'incoming')
  const outgoing = connections.filter((c) => c.status === 'pending' && c.direction === 'outgoing')

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Invite */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-text-primary">Add Friend</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="friend@email.com"
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && void sendInvite()}
          />
          <button
            onClick={() => void sendInvite()}
            disabled={inviting || !inviteEmail.trim()}
            className="btn-primary px-4 disabled:opacity-40 flex items-center gap-2"
          >
            {inviting ? <Spinner size="sm" /> : <UserPlus className="w-4 h-4" />}
            Invite
          </button>
        </div>
        {inviteResult && (
          <div className={`flex items-center gap-2 text-xs ${inviteResult.ok ? 'text-green-400' : 'text-red-400'}`}>
            {inviteResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {inviteResult.message}
          </div>
        )}
      </div>

      {/* Incoming invites */}
      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Friend Requests ({incoming.length})</p>
          {incoming.map((c) => (
            <div key={c.id} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-sm font-bold flex-shrink-0">
                {c.friend_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{c.friend_name}</p>
                <p className="text-xs text-text-tertiary">{c.friend_email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void acceptInvite(c.id)}
                  disabled={actionId === c.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors disabled:opacity-40"
                >
                  {actionId === c.id ? <Spinner size="sm" /> : 'Accept'}
                </button>
                <button
                  onClick={() => void removeConnection(c.id)}
                  disabled={actionId === c.id}
                  className="text-xs px-2 py-1.5 rounded-lg border border-border text-text-tertiary hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends activity feed */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-tertiary" />
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Friends Today</p>
        </div>
        {loadingFeed ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : feed.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-text-tertiary">
              {accepted.length === 0
                ? 'Add friends to see their progress here.'
                : 'No friend activity yet today.'}
            </p>
          </div>
        ) : (
          feed.map((f) => (
            <div key={f.friend_id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-bold flex-shrink-0">
                  {f.friend_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{f.friend_name}</p>
                  {f.streak_highlight && (
                    <p className="text-xs text-text-tertiary">{f.streak_highlight}</p>
                  )}
                </div>
                {f.momentum_score != null && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-indigo-400">{f.momentum_score}</p>
                    <p className="text-xs text-text-tertiary">momentum</p>
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  {f.habits_today} habits
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  {f.tasks_today} tasks
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* All connections */}
      {accepted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Friends ({accepted.length})</p>
          {accepted.map((c) => (
            <div key={c.id} className="card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center text-text-secondary text-sm font-bold flex-shrink-0">
                {c.friend_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{c.friend_name}</p>
                <p className="text-xs text-text-tertiary">{c.friend_email}</p>
              </div>
              <button
                onClick={() => void removeConnection(c.id)}
                disabled={actionId === c.id}
                className="text-xs px-2 py-1.5 rounded-lg border border-border text-text-tertiary hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sent pending */}
      {outgoing.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Sent Invites</p>
          {outgoing.map((c) => (
            <div key={c.id} className="card p-4 flex items-center gap-3 opacity-60">
              <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center text-text-tertiary text-sm font-bold flex-shrink-0">
                {c.friend_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-secondary">{c.friend_email}</p>
                <p className="text-xs text-text-tertiary">Awaiting response</p>
              </div>
              <button
                onClick={() => void removeConnection(c.id)}
                disabled={actionId === c.id}
                className="text-xs px-2 py-1.5 rounded-lg border border-border text-text-tertiary hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {loadingConns && connections.length === 0 && (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      )}
    </div>
  )
}
