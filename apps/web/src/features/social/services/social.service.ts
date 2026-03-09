import { createAdminClient } from '@/lib/supabase/admin'

export interface SocialConnection {
  id: string
  friend_id: string
  friend_name: string
  friend_email: string
  friend_avatar: string | null
  status: 'pending' | 'accepted' | 'blocked'
  direction: 'outgoing' | 'incoming'
  created_at: string
}

export interface FriendActivity {
  friend_id: string
  friend_name: string
  friend_avatar: string | null
  habits_today: number
  tasks_today: number
  momentum_score: number | null
  streak_highlight: string | null   // e.g. "7-day meditation streak"
  updated_at: string
}

export class SocialService {
  // ── Connection management ─────────────────────────────────────────────────

  static async sendInvite(requesterId: string, email: string): Promise<{ ok: boolean; message: string }> {
    const supabase = createAdminClient()

    // Look up user by email
    const { data: target } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!target) {
      return { ok: false, message: 'No VitaMind account found with that email address.' }
    }
    if (target.id === requesterId) {
      return { ok: false, message: 'You cannot add yourself.' }
    }

    // Check if connection already exists (either direction)
    const { data: existing } = await supabase
      .from('social_connections')
      .select('id, status')
      .or(`and(requester_id.eq.${requesterId},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${requesterId})`)
      .single()

    if (existing) {
      if (existing.status === 'accepted') return { ok: false, message: 'You are already friends.' }
      if (existing.status === 'pending') return { ok: false, message: 'Invite already pending.' }
    }

    await supabase.from('social_connections').insert({
      requester_id: requesterId,
      addressee_id: target.id,
      status: 'pending',
    })

    return { ok: true, message: `Invite sent to ${target.name}.` }
  }

  static async acceptInvite(userId: string, connectionId: string): Promise<void> {
    const supabase = createAdminClient()
    await supabase
      .from('social_connections')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
  }

  static async removeConnection(userId: string, connectionId: string): Promise<void> {
    const supabase = createAdminClient()
    await supabase
      .from('social_connections')
      .delete()
      .eq('id', connectionId)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  }

  static async getConnections(userId: string): Promise<SocialConnection[]> {
    const supabase = createAdminClient()

    const { data: rows } = await supabase
      .from('social_connections')
      .select('id, requester_id, addressee_id, status, created_at')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .neq('status', 'blocked')
      .order('created_at', { ascending: false })

    if (!rows?.length) return []

    // Collect friend IDs
    const friendIds = rows.map((r) =>
      r.requester_id === userId ? r.addressee_id : r.requester_id
    )

    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', friendIds)

    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))

    return rows.map((r) => {
      const isRequester = r.requester_id === userId
      const friendId = isRequester ? r.addressee_id : r.requester_id
      const friend = userMap.get(friendId)
      return {
        id: r.id as string,
        friend_id: friendId as string,
        friend_name: (friend?.name ?? 'Unknown') as string,
        friend_email: (friend?.email ?? '') as string,
        friend_avatar: (friend?.avatar_url ?? null) as string | null,
        status: r.status as 'pending' | 'accepted' | 'blocked',
        direction: (isRequester ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
        created_at: r.created_at as string,
      }
    })
  }

  // ── Activity feed ─────────────────────────────────────────────────────────

  static async getFriendFeed(userId: string): Promise<FriendActivity[]> {
    const supabase = createAdminClient()

    // Get accepted friend IDs
    const { data: conns } = await supabase
      .from('social_connections')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (!conns?.length) return []

    const friendIds = conns.map((c) =>
      c.requester_id === userId ? c.addressee_id : c.requester_id
    ) as string[]

    const today = new Date().toISOString().split('T')[0]

    const [{ data: users }, { data: habitLogs }, { data: tasks }, { data: momentumRows }] = await Promise.all([
      supabase.from('users').select('id, name, avatar_url').in('id', friendIds),
      supabase.from('habit_logs').select('user_id, status').in('user_id', friendIds).eq('date', today).eq('status', 'completed'),
      supabase.from('tasks').select('user_id, status').in('user_id', friendIds).eq('status', 'completed').gte('completed_at', `${today}T00:00:00Z`),
      supabase.from('momentum_snapshots').select('user_id, score').in('user_id', friendIds).order('created_at', { ascending: false }).limit(friendIds.length * 2),
    ])

    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))
    const habitMap = new Map<string, number>()
    const taskMap = new Map<string, number>()
    const momentumMap = new Map<string, number>()

    for (const h of habitLogs ?? []) {
      habitMap.set(h.user_id as string, (habitMap.get(h.user_id as string) ?? 0) + 1)
    }
    for (const t of tasks ?? []) {
      taskMap.set(t.user_id as string, (taskMap.get(t.user_id as string) ?? 0) + 1)
    }
    for (const m of momentumRows ?? []) {
      if (!momentumMap.has(m.user_id as string)) {
        momentumMap.set(m.user_id as string, m.score as number)
      }
    }

    return friendIds.map((fid) => {
      const u = userMap.get(fid)
      const habits = habitMap.get(fid) ?? 0
      const tasks = taskMap.get(fid) ?? 0
      return {
        friend_id: fid,
        friend_name: (u?.name ?? 'Unknown') as string,
        friend_avatar: (u?.avatar_url ?? null) as string | null,
        habits_today: habits,
        tasks_today: tasks,
        momentum_score: momentumMap.get(fid) ?? null,
        streak_highlight: habits > 0 ? `${habits} habit${habits > 1 ? 's' : ''} completed today` : null,
        updated_at: new Date().toISOString(),
      }
    }).sort((a, b) => (b.habits_today + b.tasks_today) - (a.habits_today + a.tasks_today))
  }
}
