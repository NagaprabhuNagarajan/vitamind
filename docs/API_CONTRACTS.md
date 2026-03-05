# VitaMind API Contracts

> Last updated: 2026-03-05
> Source of truth: `apps/web/src/app/api/v1/` route handlers and `apps/web/src/lib/` utilities

## Overview

All API routes are served from the Next.js web application under the `/api/v1` prefix. Authentication is handled via Supabase Auth with JWT tokens stored in HTTP-only cookies. Every route is wrapped with per-user rate limiting.

**Base URL**: `/api/v1`

---

## Authentication

All routes require a valid Supabase session. The session is read from cookies by the server-side Supabase client (`createClient()` from `@/lib/supabase/server`). There are no public/unauthenticated API endpoints.

**Mechanism**: Supabase Auth JWT via HTTP-only cookies (set during login via Supabase client SDK).

**Auth guard**: Every handler calls `requireAuth()` which invokes `supabase.auth.getUser()`. If the session is missing or invalid, it returns a 401 response.

---

## Rate Limiting

Per-user, per-route sliding window rate limiter. Implemented in-memory (per serverless instance). Three tiers:

| Tier        | Max Requests | Window   | Applied To               |
| ----------- | ------------ | -------- | ------------------------ |
| `standard`  | 100          | 60 sec   | Tasks, Goals, Habits, Habit Log |
| `dashboard` | 30           | 60 sec   | Dashboard                |
| `ai`        | 10           | 60 sec   | Daily Plan, Chat, Insights |

When rate limited, the response includes a `Retry-After` header (seconds).

---

## Response Envelope

All responses follow a consistent envelope format.

### Success (single resource)

```json
{
  "data": { ... },
  "error": null
}
```

### Success (paginated list)

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  },
  "error": null
}
```

### Error

```json
{
  "data": null,
  "error": {
    "message": "Human-readable error message",
    "code": "OPTIONAL_ERROR_CODE"
  }
}
```

---

## Pagination

List endpoints accept optional query parameters:

| Param   | Type   | Default | Max | Description         |
| ------- | ------ | ------- | --- | ------------------- |
| `page`  | number | 1       | --  | 1-based page number |
| `limit` | number | 20      | 100 | Items per page      |

Invalid values fall back to defaults silently.

---

## Error Codes

| HTTP Status | Meaning                | When                                  |
| ----------- | ---------------------- | ------------------------------------- |
| 400         | Bad Request            | Missing or invalid request body/params |
| 401         | Unauthorized           | No valid session cookie               |
| 403         | Forbidden              | Authenticated but not authorized      |
| 404         | Not Found              | Resource does not exist or belongs to another user |
| 429         | Too Many Requests      | Rate limit exceeded (check `Retry-After` header) |
| 500         | Internal Server Error  | Unexpected server error               |

---

## Endpoints

### Tasks

#### GET /api/v1/tasks

List all tasks for the authenticated user with optional filters and pagination.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Query parameters**:

| Param      | Type   | Required | Values                                       |
| ---------- | ------ | -------- | -------------------------------------------- |
| `status`   | string | No       | `todo`, `in_progress`, `completed`, `cancelled` |
| `priority` | string | No       | `low`, `medium`, `high`, `urgent`            |
| `goal_id`  | string | No       | UUID of a goal                               |
| `date`     | string | No       | `YYYY-MM-DD` -- filter by due date           |
| `page`     | number | No       | Default: 1                                   |
| `limit`    | number | No       | Default: 20, max: 100                        |

**Response** (200):

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "goal_id": "uuid | null",
      "title": "Ship feature X",
      "description": "Details here",
      "priority": "high",
      "status": "todo",
      "due_date": "2026-03-10",
      "completed_at": null,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  },
  "error": null
}
```

---

#### GET /api/v1/tasks/:id

Get a single task by ID.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Response** (200):

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "goal_id": null,
    "title": "Ship feature X",
    "description": null,
    "priority": "medium",
    "status": "todo",
    "due_date": null,
    "completed_at": null,
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-01T10:00:00Z"
  },
  "error": null
}
```

**Errors**: 404 if task not found or belongs to another user.

---

#### POST /api/v1/tasks

Create a new task.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body**:

```json
{
  "title": "Ship feature X",
  "description": "Optional details",
  "priority": "high",
  "due_date": "2026-03-10",
  "goal_id": "uuid"
}
```

| Field         | Type   | Required | Notes                                   |
| ------------- | ------ | -------- | --------------------------------------- |
| `title`       | string | Yes      | 1-300 characters                        |
| `description` | string | No       | Max 2000 characters                     |
| `priority`    | string | Yes      | `low`, `medium`, `high`, `urgent`       |
| `due_date`    | string | No       | `YYYY-MM-DD`                            |
| `goal_id`     | string | No       | UUID of an existing goal                |

**Response** (201): Single task object in `data` envelope.

---

#### PUT /api/v1/tasks/:id

Update an existing task.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body** (all fields optional):

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "urgent",
  "status": "completed",
  "due_date": "2026-03-15",
  "goal_id": "uuid"
}
```

| Field         | Type          | Notes                                            |
| ------------- | ------------- | ------------------------------------------------ |
| `title`       | string        | 1-300 characters                                 |
| `description` | string | null | Set to null to clear                             |
| `priority`    | string        | `low`, `medium`, `high`, `urgent`                |
| `status`      | string        | `todo`, `in_progress`, `completed`, `cancelled`  |
| `due_date`    | string | null | `YYYY-MM-DD` or null to clear                   |
| `goal_id`     | string | null | UUID or null to unlink                           |

Note: When `status` is set to `completed`, the server should set `completed_at`. When changed away from `completed`, `completed_at` should be cleared. This is enforced by the database constraint.

**Response** (200): Updated task object in `data` envelope.

**Errors**: 404 if task not found.

---

#### DELETE /api/v1/tasks/:id

Delete a task.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Response** (200):

```json
{
  "data": { "deleted": true },
  "error": null
}
```

**Errors**: 404 if task not found.

---

### Goals

#### GET /api/v1/goals

List all goals for the authenticated user with pagination.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Query parameters**:

| Param   | Type   | Required | Notes              |
| ------- | ------ | -------- | ------------------ |
| `page`  | number | No       | Default: 1         |
| `limit` | number | No       | Default: 20, max: 100 |

**Response** (200): Paginated array of goal objects.

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Learn Rust",
      "description": "Complete the Rust book",
      "target_date": "2026-06-01",
      "progress": 35,
      "is_completed": false,
      "created_at": "2026-01-15T08:00:00Z",
      "updated_at": "2026-03-01T12:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 },
  "error": null
}
```

---

#### GET /api/v1/goals/:id

Get a single goal by ID.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Response** (200): Single goal object in `data` envelope.

**Errors**: 404 if goal not found.

---

#### POST /api/v1/goals

Create a new goal.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body**:

```json
{
  "title": "Learn Rust",
  "description": "Complete the Rust book and build a CLI tool",
  "target_date": "2026-06-01",
  "progress": 0
}
```

| Field         | Type   | Required | Notes                     |
| ------------- | ------ | -------- | ------------------------- |
| `title`       | string | Yes      | 1-200 characters          |
| `description` | string | No       | Max 1000 characters       |
| `target_date` | string | No       | `YYYY-MM-DD`              |
| `progress`    | number | No       | 0-100, default: 0         |

**Response** (201): Created goal object in `data` envelope.

---

#### PUT /api/v1/goals/:id

Update an existing goal.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body** (all fields optional):

```json
{
  "title": "Updated goal title",
  "description": "Updated description",
  "target_date": "2026-07-01",
  "progress": 50,
  "is_completed": false
}
```

| Field          | Type          | Notes                         |
| -------------- | ------------- | ----------------------------- |
| `title`        | string        | 1-200 characters              |
| `description`  | string | null | Max 1000 characters           |
| `target_date`  | string | null | `YYYY-MM-DD` or null to clear |
| `progress`     | number        | 0-100                         |
| `is_completed` | boolean       | --                            |

Note: Goal `progress` is also automatically recalculated by a database trigger whenever linked tasks change status.

**Response** (200): Updated goal object in `data` envelope.

**Errors**: 404 if goal not found.

---

#### DELETE /api/v1/goals/:id

Delete a goal. Linked tasks will have their `goal_id` set to `NULL` (ON DELETE SET NULL).

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Response** (200):

```json
{
  "data": { "deleted": true },
  "error": null
}
```

**Errors**: 404 if goal not found.

---

### Habits

#### GET /api/v1/habits

List all habits for the authenticated user, including current streak and today's log entry.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Query parameters**:

| Param   | Type   | Required | Notes              |
| ------- | ------ | -------- | ------------------ |
| `page`  | number | No       | Default: 1         |
| `limit` | number | No       | Default: 20, max: 100 |

**Response** (200): Paginated array of habit objects with streak data.

```json
{
  "data": [
    {
      "habit": {
        "id": "uuid",
        "user_id": "uuid",
        "title": "Morning meditation",
        "description": "10 minutes of guided meditation",
        "frequency": "daily",
        "target_days": null,
        "reminder_time": "07:00",
        "is_active": true,
        "created_at": "2026-02-01T06:00:00Z",
        "updated_at": "2026-02-01T06:00:00Z"
      },
      "streak": 12,
      "todayLog": {
        "id": "uuid",
        "habit_id": "uuid",
        "user_id": "uuid",
        "date": "2026-03-05",
        "status": "completed",
        "created_at": "2026-03-05T07:15:00Z"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 },
  "error": null
}
```

Note: The habits endpoint does not expose a GET /:id route. Individual habit retrieval is handled client-side from the list.

---

#### POST /api/v1/habits

Create a new habit.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body**:

```json
{
  "title": "Morning meditation",
  "description": "10 minutes of guided meditation",
  "frequency": "daily",
  "target_days": [1, 2, 3, 4, 5],
  "reminder_time": "07:00"
}
```

| Field           | Type     | Required | Notes                                          |
| --------------- | -------- | -------- | ---------------------------------------------- |
| `title`         | string   | Yes      | 1-200 characters                               |
| `description`   | string   | No       | Max 500 characters                             |
| `frequency`     | string   | Yes      | `daily`, `weekly`, `weekdays`, `weekends`      |
| `target_days`   | number[] | No       | Array of weekday numbers (0=Sun ... 6=Sat)     |
| `reminder_time` | string   | No       | `HH:MM` format (local time)                   |

**Response** (201): Created habit object in `data` envelope.

---

#### PUT /api/v1/habits/:id

Update an existing habit.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body** (all fields optional):

```json
{
  "title": "Updated habit",
  "description": "Updated description",
  "frequency": "weekdays",
  "target_days": [1, 2, 3, 4, 5],
  "reminder_time": "08:00",
  "is_active": true
}
```

| Field           | Type            | Notes                                          |
| --------------- | --------------- | ---------------------------------------------- |
| `title`         | string          | 1-200 characters                               |
| `description`   | string | null   | Max 500 characters, null to clear              |
| `frequency`     | string          | `daily`, `weekly`, `weekdays`, `weekends`      |
| `target_days`   | number[] | null | Array of 0-6, null to clear                    |
| `reminder_time` | string | null   | `HH:MM` format or null to clear               |
| `is_active`     | boolean         | --                                             |

**Response** (200): Updated habit object in `data` envelope.

**Errors**: 404 if habit not found.

---

#### DELETE /api/v1/habits/:id

Delete a habit. All associated habit_logs are cascade-deleted.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Response** (200):

```json
{
  "data": { "deleted": true },
  "error": null
}
```

**Errors**: 404 if habit not found.

---

### Habit Log

#### POST /api/v1/habit-log

Log today's habit completion or skip. Uses upsert semantics (one log per habit per day).

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body**:

```json
{
  "habit_id": "uuid",
  "status": "completed"
}
```

| Field      | Type   | Required | Values                     |
| ---------- | ------ | -------- | -------------------------- |
| `habit_id` | string | Yes      | UUID of an existing habit  |
| `status`   | string | Yes      | `completed` or `skipped`   |

Note: Only `completed` and `skipped` are accepted. The `missed` status is assigned by background/scheduled logic, not by direct user action.

**Response** (201):

```json
{
  "data": {
    "id": "uuid",
    "habit_id": "uuid",
    "user_id": "uuid",
    "date": "2026-03-05",
    "status": "completed",
    "created_at": "2026-03-05T07:15:00Z"
  },
  "error": null
}
```

**Errors**:
- 400 if `habit_id` is missing
- 400 if `status` is not `completed` or `skipped`

---

### Dashboard

#### GET /api/v1/dashboard

Aggregated dashboard data assembled in a single round-trip. Fetches today's tasks, overdue tasks, all goals, all habits with streaks, and the latest AI insight in parallel.

- **Auth**: Required
- **Rate limit**: dashboard (30/min)

**Query parameters**: None.

**Response** (200):

```json
{
  "data": {
    "tasks_today": [
      {
        "id": "uuid",
        "title": "Ship feature X",
        "priority": "high",
        "status": "todo",
        "due_date": "2026-03-05",
        "...": "full task object"
      }
    ],
    "tasks_overdue": [
      {
        "id": "uuid",
        "title": "Review PR",
        "priority": "medium",
        "status": "todo",
        "due_date": "2026-03-03",
        "...": "full task object"
      }
    ],
    "goals": [
      {
        "id": "uuid",
        "title": "Learn Rust",
        "progress": 35,
        "is_completed": false,
        "...": "full goal object"
      }
    ],
    "habits_today": [
      {
        "habit": { "...": "full habit object" },
        "streak": 12,
        "todayLog": { "...": "habit_log object or null" }
      }
    ],
    "latest_insight": {
      "id": "uuid",
      "type": "daily_plan",
      "content": "Focus on shipping feature X...",
      "metadata": {},
      "created_at": "2026-03-05T06:00:00Z"
    }
  },
  "error": null
}
```

Note: `latest_insight` is `null` if no AI insights have been generated yet.

---

### AI

All AI endpoints are rate-limited to 10 requests per minute per user to control costs.

#### POST /api/v1/ai/daily-plan

Generate (or retrieve cached) a personalized daily plan based on the user's current tasks, goals, and habits.

- **Auth**: Required
- **Rate limit**: ai (10/min)

**Request body** (optional):

```json
{
  "force": false
}
```

| Field   | Type    | Required | Default | Notes                                  |
| ------- | ------- | -------- | ------- | -------------------------------------- |
| `force` | boolean | No       | `false` | Set to `true` to bypass cache and regenerate |

**Response** (200):

```json
{
  "data": {
    "plan": "Good morning. You have 3 important tasks today...",
    "cached": true,
    "generated_at": "2026-03-05T06:00:00Z"
  },
  "error": null
}
```

| Field          | Type    | Description                              |
| -------------- | ------- | ---------------------------------------- |
| `plan`         | string  | AI-generated daily plan text             |
| `cached`       | boolean | Whether this was served from cache       |
| `generated_at` | string  | ISO 8601 timestamp                       |

AI parameters: max 600 tokens, temperature 0.6. The plan is cached as an `ai_insights` row with type `daily_plan`.

---

#### POST /api/v1/ai/chat

Send a conversation to the AI assistant. The assistant has context about the user's tasks, goals, and habits.

- **Auth**: Required
- **Rate limit**: ai (10/min)

**Request body**:

```json
{
  "messages": [
    { "role": "user", "content": "What should I focus on today?" },
    { "role": "assistant", "content": "Based on your tasks..." },
    { "role": "user", "content": "What about my habits?" }
  ]
}
```

| Field      | Type    | Required | Constraints                            |
| ---------- | ------- | -------- | -------------------------------------- |
| `messages` | array   | Yes      | Non-empty, max 20 messages             |

Each message:

| Field     | Type   | Values                  |
| --------- | ------ | ----------------------- |
| `role`    | string | `user` or `assistant`   |
| `content` | string | Message text            |

The last message in the array must have `role: "user"`.

Only the last 10 messages are sent to the AI model to cap token usage.

**Response** (200):

```json
{
  "data": {
    "message": {
      "role": "assistant",
      "content": "Based on your current habits..."
    },
    "timestamp": "2026-03-05T14:30:00Z"
  },
  "error": null
}
```

AI parameters: max 400 tokens, temperature 0.7.

**Errors**:
- 400 if `messages` array is empty
- 400 if more than 20 messages
- 400 if last message is not from `user`

---

#### POST /api/v1/ai/insights

Generate (or retrieve cached) productivity insights based on the user's activity patterns.

- **Auth**: Required
- **Rate limit**: ai (10/min)

**Request body** (optional):

```json
{
  "force": false
}
```

| Field   | Type    | Required | Default | Notes                                  |
| ------- | ------- | -------- | ------- | -------------------------------------- |
| `force` | boolean | No       | `false` | Set to `true` to bypass cache and regenerate |

**Response** (200):

```json
{
  "data": {
    "insight": "You completed 85% of your tasks this week...",
    "cached": false
  },
  "error": null
}
```

| Field     | Type    | Description                              |
| --------- | ------- | ---------------------------------------- |
| `insight` | string  | AI-generated productivity insight text   |
| `cached`  | boolean | Whether this was served from cache       |

AI parameters: max 300 tokens, temperature 0.5. Cached as an `ai_insights` row with type `productivity`.

---

### User

#### GET /api/v1/user

Get the authenticated user's profile.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Response** (200):

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "avatar_url": null,
    "created_at": "2026-01-15T08:00:00Z"
  },
  "error": null
}
```

---

#### PUT /api/v1/user

Update the authenticated user's profile.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Request body** (all fields optional):

```json
{
  "full_name": "Jane Doe",
  "avatar_url": "https://..."
}
```

| Field        | Type          | Notes                  |
| ------------ | ------------- | ---------------------- |
| `full_name`  | string | null | 1-100 characters       |
| `avatar_url` | string | null | Valid URL or null       |

**Response** (200): Updated user object in `data` envelope.

---

#### DELETE /api/v1/user

Delete the authenticated user's account and all associated data (cascade). This action is irreversible.

- **Auth**: Required
- **Rate limit**: standard (100/min)

**Response** (200):

```json
{
  "data": { "deleted": true },
  "error": null
}
```

Note: Deletes all tasks, goals, habits, habit_logs, and ai_insights belonging to the user, then removes the auth account.

---

### Health Check

#### GET /api/health

Public endpoint (no auth required) to verify the service is running and can connect to Supabase.

**Response** (200):

```json
{
  "status": "healthy",
  "timestamp": "2026-03-05T14:30:00Z",
  "supabase": "connected"
}
```

**Response** (503 -- unhealthy):

```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-05T14:30:00Z",
  "supabase": "disconnected"
}
```

---

## Endpoint Summary

| Method | Path                    | Rate Limit | Description                     |
| ------ | ----------------------- | ---------- | ------------------------------- |
| GET    | `/api/v1/tasks`         | standard   | List tasks (filtered, paginated)|
| GET    | `/api/v1/tasks/:id`     | standard   | Get single task                 |
| POST   | `/api/v1/tasks`         | standard   | Create task                     |
| PUT    | `/api/v1/tasks/:id`     | standard   | Update task                     |
| DELETE | `/api/v1/tasks/:id`     | standard   | Delete task                     |
| GET    | `/api/v1/goals`         | standard   | List goals (paginated)          |
| GET    | `/api/v1/goals/:id`     | standard   | Get single goal                 |
| POST   | `/api/v1/goals`         | standard   | Create goal                     |
| PUT    | `/api/v1/goals/:id`     | standard   | Update goal                     |
| DELETE | `/api/v1/goals/:id`     | standard   | Delete goal                     |
| GET    | `/api/v1/habits`        | standard   | List habits with streaks        |
| POST   | `/api/v1/habits`        | standard   | Create habit                    |
| PUT    | `/api/v1/habits/:id`    | standard   | Update habit                    |
| DELETE | `/api/v1/habits/:id`    | standard   | Delete habit                    |
| POST   | `/api/v1/habit-log`     | standard   | Log habit completion/skip       |
| GET    | `/api/v1/dashboard`     | dashboard  | Aggregated dashboard data       |
| POST   | `/api/v1/ai/daily-plan` | ai         | Generate daily plan             |
| POST   | `/api/v1/ai/chat`       | ai         | AI chat assistant               |
| POST   | `/api/v1/ai/insights`   | ai         | Productivity insights           |
| GET    | `/api/v1/user`          | standard   | Get user profile                |
| PUT    | `/api/v1/user`          | standard   | Update user profile             |
| DELETE | `/api/v1/user`          | standard   | Delete account (cascade)        |
| GET    | `/api/health`           | none       | Health check (public)           |
