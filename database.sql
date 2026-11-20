-- ==============================================================================
-- QUVASOY GYM — TELEGRAM MEMBERSHIP MANAGEMENT BOT
-- Supabase PostgreSQL Database Migration Script
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ADMINS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admins_telegram_id ON public.admins(telegram_id);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON public.admins(is_active);

-- ------------------------------------------------------------------------------
-- 2. MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    telegram_id BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON public.members(full_name);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON public.members(is_active);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. MEMBERSHIPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_type TEXT NOT NULL CHECK (membership_type IN ('daily', 'monthly')),
    start_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired', 'cancelled')),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON public.memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_expiration ON public.memberships(expiration_date);
CREATE INDEX IF NOT EXISTS idx_memberships_type ON public.memberships(membership_type);

-- ------------------------------------------------------------------------------
-- 4. PAYMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    registered_by_telegram_id BIGINT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);

-- ------------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE (Anti-spam / Deduplication)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('before_3_days', 'before_1_day', 'on_expiration', 'expired')),
    target_date DATE NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_notification_record UNIQUE (membership_id, notification_type, target_date)
);

CREATE INDEX IF NOT EXISTS idx_notifications_lookup ON public.notifications(membership_id, notification_type, target_date);

-- ------------------------------------------------------------------------------
-- 6. BOT SESSIONS TABLE (Serverless Persistent Session Store)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_sessions (
    id BIGINT PRIMARY KEY, -- Telegram user_id
    session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 7. AUTO-UPDATE UPDATED_AT TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_members_updated_at ON public.members;
CREATE TRIGGER trigger_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_memberships_updated_at ON public.memberships;
CREATE TRIGGER trigger_memberships_updated_at
    BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. HELPER FUNCTION: Recalculate Membership Statuses
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_membership_statuses()
RETURNS VOID AS $$
BEGIN
    -- Set expired
    UPDATE public.memberships
    SET status = 'expired'
    WHERE status != 'cancelled'
      AND expiration_date < CURRENT_DATE
      AND status != 'expired';

    -- Set expiring (within 3 days inclusive, today until today+3)
    UPDATE public.memberships
    SET status = 'expiring'
    WHERE status != 'cancelled'
      AND expiration_date >= CURRENT_DATE
      AND expiration_date <= CURRENT_DATE + INTERVAL '3 days'
      AND status != 'expiring';

    -- Set active (more than 3 days)
    UPDATE public.memberships
    SET status = 'active'
    WHERE status != 'cancelled'
      AND expiration_date > CURRENT_DATE + INTERVAL '3 days'
      AND status != 'active';
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- Note: The bot backend connects using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- For standard authenticated or public access, create permissive policies if needed:
DROP POLICY IF EXISTS "Service role full access on admins" ON public.admins;
CREATE POLICY "Service role full access on admins" ON public.admins FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on members" ON public.members;
CREATE POLICY "Service role full access on members" ON public.members FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on memberships" ON public.memberships;
CREATE POLICY "Service role full access on memberships" ON public.memberships FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on payments" ON public.payments;
CREATE POLICY "Service role full access on payments" ON public.payments FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;
CREATE POLICY "Service role full access on notifications" ON public.notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on bot_sessions" ON public.bot_sessions;
CREATE POLICY "Service role full access on bot_sessions" ON public.bot_sessions FOR ALL USING (true);
 