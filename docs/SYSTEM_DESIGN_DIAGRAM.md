# System Design Diagram

High Level Architecture

Client Layer - Flutter Mobile App - Next.js Web Dashboard

API Layer - REST / GraphQL APIs - Authentication Middleware

Application Layer - Task Service - Goal Service - Habit Service - AI
Insight Service - Notification Service

Data Layer - PostgreSQL (Supabase) - Object Storage

AI Layer - Prompt Builder - Context Manager - LLM API (OpenAI / Groq)

External Integrations - Firebase Cloud Messaging - Email Service -
Calendar APIs

Flow: User -\> Mobile App -\> API -\> Backend Services -\> Database -\>
AI Layer -\> Response -\> UI
