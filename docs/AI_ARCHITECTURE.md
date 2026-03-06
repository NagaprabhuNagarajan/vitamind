# AI Architecture

## AI Responsibilities

-   Daily planning
-   Productivity insights
-   Natural language chat
-   Life Momentum computation
-   Cascade detection (habit-goal ripple analysis)
-   Time Fingerprint analysis
-   Burnout detection
-   Goal decomposition and autopilot
-   Pattern discovery (cross-domain correlations)
-   Voice parsing (natural language to structured data)
-   Monthly life review generation

## AI Context Data

The system sends the following context to AI:

-   Tasks (with status, priority, due dates, completion timestamps)
-   Goals (with progress, target dates, linked tasks)
-   Habits (with streaks, completion rates, log history)
-   Calendar events
-   Momentum history
-   Productivity profile (Time Fingerprint)

## Example Prompt

You are a productivity assistant.

User Data: Tasks: Goals: Habits:

Generate a daily plan and recommendations.

## Cost Optimization Strategy

-   Cache AI responses
-   Generate daily plan once per day
-   Avoid using AI for simple calculations
-   Use deterministic formulas where possible (Momentum Score, Burnout Radar)
-   Limit token usage with structured output formats
-   Batch pattern analysis into weekly jobs rather than on-demand

---

## New AI Capabilities

### Momentum Score Computation

**Type:** Deterministic formula (no LLM call)

Computes a daily 0-100 score using a weighted formula across four domains:

```
momentum = (
  task_velocity     * 0.30 +   // % of tasks completed on time (7-day window)
  habit_consistency * 0.30 +   // % of habits completed vs expected (7-day window)
  goal_trajectory   * 0.25 +   // weighted avg goal progress vs expected pace
  (1 - overdue_pressure) * 0.15  // inverse of overdue task ratio
)
```

Each component is normalized to 0-100 before weighting. The score is stored in `momentum_snapshots` and computed daily via a scheduled job.

**Cost:** Zero (pure SQL/computation, no AI tokens).

---

### Burnout Detection

**Type:** Deterministic multi-signal analysis (no LLM call)

Analyzes multiple signals to produce a burnout risk score (0-1):

| Signal | Weight | Detection Method |
| ------ | ------ | ---------------- |
| Habit streak decline | 0.25 | Compare current 7-day completion rate vs previous 7-day rate |
| Overdue task accumulation | 0.25 | Count of overdue tasks relative to total active tasks |
| Task throughput drop | 0.20 | Compare tasks completed this week vs 4-week average |
| Missed deadlines | 0.15 | Tasks that passed due_date without completion (14-day window) |
| Goal stagnation | 0.15 | Goals with zero progress change in 14+ days |

Risk thresholds: 0-0.3 (healthy), 0.3-0.6 (caution), 0.6-1.0 (burnout warning).

When risk exceeds 0.6, the system triggers a push notification and adjusts the daily plan to suggest lighter workloads.

**Cost:** Zero (pure computation).

---

### Cascade Detection (Habit-Goal Ripple Analysis)

**Type:** Statistical analysis + LLM interpretation

**Step 1 (deterministic):** For each habit-goal pair, compute the Pearson correlation between daily habit completion (binary) and weekly goal progress delta over the past 30-60 days.

**Step 2 (LLM call):** Send the top correlations (positive and negative) to the AI for natural language interpretation.

```
Prompt: Given these habit-goal correlations for a user:
- "Morning exercise" <-> "Learn Spanish": r=0.72
- "Meditation" <-> "Ship product v2": r=0.65
- "Social media limit" <-> "Read 20 books": r=0.58

Explain the likely causal connections in 2-3 sentences per pair.
Keep explanations practical and actionable.
Max output: 400 tokens.
```

Results are stored in `habit_goal_links` with `created_by = 'ai'`.

**Cost:** ~200-400 tokens per analysis. Run weekly, not on-demand.

---

### Time Fingerprint Analysis (Productivity Pattern Mining)

**Type:** Deterministic analysis (no LLM call)

Mines `tasks.completed_at` timestamps and `habit_logs.created_at` to build a per-user productivity profile:

```json
{
  "peak_hours": [9, 10, 14, 15],
  "low_hours": [12, 13, 19, 20],
  "best_day": "Tuesday",
  "worst_day": "Friday",
  "habit_morning_rate": 0.85,
  "habit_evening_rate": 0.62,
  "task_completion_by_hour": { "9": 0.18, "10": 0.15, ... },
  "weekly_pattern": { "Mon": 0.82, "Tue": 0.91, ... }
}
```

Requires at least 14 days of data. Recalculated weekly. Stored in `users.productivity_profile` (JSONB).

**Cost:** Zero (pure SQL aggregation).

---

### Goal Decomposition (AI Task Generation)

**Type:** LLM call

Takes a goal (or large task) and generates 3-8 concrete subtasks with time estimates.

```
Prompt: Break down this goal into actionable tasks:
Goal: "{goal_title}"
Description: "{goal_description}"
Target date: "{target_date}"
Current progress: {progress}%

Generate 3-8 specific, actionable tasks. For each task:
- title (concise, starts with a verb)
- estimated_minutes (realistic estimate)
- priority (low/medium/high/urgent)
- suggested_due_date (spread across the remaining timeline)

Respond in JSON format.
Max output: 500 tokens.
```

**Cost:** ~300-500 tokens per decomposition. User-triggered (not scheduled), rate-limited to 5/day per user on Pro.

---

### Goal Autopilot

**Type:** LLM call (weekly)

Extension of goal decomposition that runs on a weekly schedule for opted-in goals:

1. Evaluate current progress vs expected pace
2. Check which generated tasks were completed, missed, or modified
3. Generate next week's tasks adjusted for actual pace
4. If behind schedule, suggest plan adjustments (extend deadline, reduce scope, increase daily effort)

```
Prompt: You are managing an autopilot plan for this goal:
Goal: "{title}" (due {target_date}, currently {progress}%)
Last week's tasks: [completed: N, missed: M, modified: K]
Remaining timeline: X weeks

Generate next week's tasks and any plan adjustments.
Max output: 600 tokens. Respond in JSON.
```

**Cost:** ~400-600 tokens per goal per week. Capped at 5 autopilot goals per user.

---

### Pattern Oracle (Cross-Domain Correlation Analysis)

**Type:** Statistical analysis + LLM interpretation

**Step 1 (deterministic):** Run correlation analysis across all data domains:
- Habit completion vs task completion rate (same day, next day)
- Day of week vs productivity metrics
- Habit combinations vs goal progress
- Time-of-day patterns vs task priority handling

**Step 2 (LLM call):** Translate statistically significant correlations (p < 0.05) into plain-language insights.

```
Prompt: Convert these statistical patterns into actionable life insights:
Patterns:
{list of correlations with r-values and p-values}

For each pattern, write one insight card:
- headline (10 words max, surprising and specific)
- explanation (2-3 sentences, practical)
- suggested_action (one concrete thing to try)

Max output: 500 tokens. Respond in JSON.
```

**Cost:** ~300-500 tokens per analysis. Run weekly.

---

### Voice Parsing (Natural Language to Structured Updates)

**Type:** LLM call

Parses a free-form voice transcript into structured life updates.

```
Prompt: Parse this life update into structured data:
Transcript: "{user_transcript}"

User's current tasks: [{id, title, status}]
User's current habits: [{id, title}]

Extract:
- task_completions: [{task_id, title_match}] -- tasks mentioned as done
- habit_logs: [{habit_id, status}] -- habits mentioned
- new_tasks: [{title, priority, due_date}] -- new tasks mentioned
- notes: string -- anything that doesn't fit above

Respond in JSON. Be conservative -- only extract what's clearly stated.
Max output: 400 tokens.
```

The parsed result is shown to the user for confirmation before any data is written. This prevents AI hallucination from corrupting user data.

**Cost:** ~200-400 tokens per voice log. Rate-limited to 10/day on Pro.

---

### Monthly Life Review Generation

**Type:** LLM call (long-form)

Generates a comprehensive monthly report on the 1st of each month.

```
Prompt: Generate a monthly life review for {month} {year}.

Data summary:
- Momentum scores: [daily scores for the month]
- Tasks: {created} created, {completed} completed, {overdue} overdue
- Habits: {active} active, {avg_rate}% average completion rate
- Goals: {goals_summary}
- Top patterns discovered: {patterns}
- Burnout risk trend: {trend}

Write a thoughtful, personal review covering:
1. Overall momentum trend and what drove it
2. Biggest wins (be specific)
3. Areas of concern (be honest but constructive)
4. Habit highlights (best streaks, improvements, declines)
5. Goal progress assessment
6. 3 specific recommendations for next month

Tone: Warm, insightful, like a thoughtful coach. Not corporate.
Max output: 1200 tokens.
```

**Cost:** ~800-1200 tokens per review per user per month. Scheduled, not on-demand. Cached in `ai_insights` with type `life_optimization`.

---

## AI Cost Summary

| Capability | Trigger | Frequency | Tokens/Call | Monthly Cost (1k users) |
| ---------- | ------- | --------- | ----------- | ----------------------- |
| Daily Plan | User/cron | 1x/day | ~600 | ~$18 |
| Chat | User | ~5x/week | ~400 | ~$20 |
| Productivity Insights | User/cron | 1x/week | ~300 | ~$3 |
| Cascade Detection | Cron | 1x/week | ~400 | ~$4 |
| Goal Decomposition | User | ~2x/week | ~500 | ~$10 |
| Goal Autopilot | Cron | 1x/week/goal | ~600 | ~$6 |
| Pattern Oracle | Cron | 1x/week | ~500 | ~$5 |
| Voice Parsing | User | ~3x/week | ~400 | ~$12 |
| Life Review | Cron | 1x/month | ~1200 | ~$1 |
| **Total** | | | | **~$79/month** |

Estimates assume GPT-4o-mini pricing (~$0.15/1M input, $0.60/1M output). Using Groq (Llama 3) would reduce costs by ~60%.

**Key cost controls:**
- Momentum, Burnout, Time Fingerprint, and Pattern Oracle Step 1 use zero AI tokens (pure computation)
- All scheduled AI jobs run at most weekly (except daily plan)
- Voice parsing and decomposition are user-triggered with per-day rate limits
- Life Review runs once per month
- All AI responses are cached and reused within their validity window
