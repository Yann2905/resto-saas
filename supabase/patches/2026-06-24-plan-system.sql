-- =====================================================
-- Migration : Système de plans (Starter / Pro / Business)
-- =====================================================

-- 1. Ajouter le plan et la date d'expiration aux restaurants
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- 2. Contrainte sur les valeurs du plan
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_plan_check;
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_plan_check
  CHECK (plan IN ('starter', 'pro', 'business'));
