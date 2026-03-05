# System Architecture

High level architecture:

Mobile App (Flutter) \| v API Layer \| v Backend Services (Supabase /
Node) \| v PostgreSQL Database \| v AI Service Layer \| v LLM APIs
(OpenAI / Groq)

## Data Flow

1.  User opens the app.
2.  App requests user data from backend.
3.  Backend collects tasks, goals, and habits.
4.  Context is sent to AI engine.
5.  AI generates insights.
6.  Results are returned to mobile app.
