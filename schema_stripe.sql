-- LifePivot — Stripe Integration DB Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

-- ── 1. Add Stripe fields to profiles ─────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- subscription_status valid values:
--   'active'   → paid, all features enabled
--   'past_due' → payment failed, show "update card" banner, keep access briefly
--   'canceled' → explicitly canceled, downgrade to free tier
--   'inactive' → never subscribed

-- Optional index for webhook lookups (look up user by stripe_customer_id)
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id);


-- ── 2. Idempotency table for Stripe webhooks ──────────────────────────────────
-- Keys on Stripe's event.id (present on ALL event types — unlike session_id
-- which only exists on checkout.session.* events). This protects against
-- double-processing on ALL webhook retries, including cancellation events.
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id     TEXT PRIMARY KEY,   -- Stripe event.id
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Only the service role key (used by the webhook handler) should touch this table.
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- No public policies — accessible only via service_role (bypasses RLS)


-- ── Verify ───────────────────────────────────────────────────────────────────
-- After running, confirm with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
-- SELECT tablename FROM pg_tables WHERE tablename = 'processed_stripe_events';
