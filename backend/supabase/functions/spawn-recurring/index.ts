// Edge function: spawn-recurring
// Runs on a daily cron schedule (midnight UTC) to create child task instances
// from recurring parent tasks whose next_occurrence date has arrived.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RecurringTask {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: string
  goal_id: string | null
  recurrence_pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  next_occurrence: string // YYYY-MM-DD
  recurrence_end_date: string | null
}

/**
 * Calculate the next occurrence date based on the recurrence pattern.
 * Returns an ISO date string (YYYY-MM-DD).
 */
function computeNextOccurrence(
  currentDate: string,
  pattern: RecurringTask['recurrence_pattern'],
): string {
  const date = new Date(currentDate + 'T00:00:00Z')

  switch (pattern) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1)
      break
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7)
      break
    case 'biweekly':
      date.setUTCDate(date.getUTCDate() + 14)
      break
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1)
      break
  }

  return date.toISOString().split('T')[0]
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const today = new Date().toISOString().split('T')[0]

    // Find all recurring tasks that need spawning today (or are overdue)
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('tasks')
      .select(
        'id, user_id, title, description, priority, goal_id, recurrence_pattern, next_occurrence, recurrence_end_date',
      )
      .eq('is_recurring', true)
      .lte('next_occurrence', today)
      .or(`recurrence_end_date.is.null,recurrence_end_date.gte.${today}`)

    if (fetchError) {
      throw new Error(`Failed to fetch recurring tasks: ${fetchError.message}`)
    }

    const tasks = (recurringTasks ?? []) as RecurringTask[]
    let spawnedCount = 0

    for (const task of tasks) {
      // Create child task instance with today's occurrence date as due_date
      const { error: insertError } = await supabase.from('tasks').insert({
        user_id: task.user_id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'todo',
        due_date: task.next_occurrence,
        goal_id: task.goal_id,
        parent_task_id: task.id,
        is_recurring: false,
      })

      if (insertError) {
        console.error(
          `Failed to spawn child for task ${task.id}: ${insertError.message}`,
        )
        continue
      }

      // Advance the parent's next_occurrence
      const nextDate = computeNextOccurrence(
        task.next_occurrence,
        task.recurrence_pattern,
      )

      // If the next date exceeds the end date, clear next_occurrence to stop future spawning
      const hasExpired =
        task.recurrence_end_date && nextDate > task.recurrence_end_date

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          next_occurrence: hasExpired ? null : nextDate,
        })
        .eq('id', task.id)

      if (updateError) {
        console.error(
          `Failed to update next_occurrence for task ${task.id}: ${updateError.message}`,
        )
        continue
      }

      spawnedCount++
    }

    return new Response(
      JSON.stringify({
        success: true,
        spawned: spawnedCount,
        evaluated: tasks.length,
        date: today,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('spawn-recurring error:', message)
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
