-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Users Table RLS Hardening
-- Migration: 003_users_rls.sql
-- Description: Ensures users table has comprehensive RLS policies for all
--              CRUD operations.  Migration 002 already created select, update,
--              and insert policies; this migration adds the missing DELETE
--              policy and is written idempotently so it can safely run even if
--              the earlier policies already exist.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS (idempotent — no-op if already enabled by 002)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ─── SELECT: users can read their own row ──────────────────────────────────
-- Already exists from 002, but included here for completeness with IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'users_select_own'
  ) THEN
    CREATE POLICY "users_select_own"
      ON public.users FOR SELECT
      USING (auth.uid() = id);
  END IF;
END
$$;

-- ─── INSERT: users can create their own profile row ────────────────────────
-- Already exists from 002, but included here for completeness with IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'users_insert_own'
  ) THEN
    CREATE POLICY "users_insert_own"
      ON public.users FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- ─── UPDATE: users can update their own profile row ────────────────────────
-- Already exists from 002, but included here for completeness with IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY "users_update_own"
      ON public.users FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- ─── DELETE: users can delete their own profile row ────────────────────────
-- This is the NEW policy not present in 002.  Required for GDPR account
-- deletion where the client-side Supabase call deletes the user row directly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'users_delete_own'
  ) THEN
    CREATE POLICY "users_delete_own"
      ON public.users FOR DELETE
      USING (auth.uid() = id);
  END IF;
END
$$;
