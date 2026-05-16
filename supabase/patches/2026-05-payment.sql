-- ==========================================================================
-- Resto SaaS — Payment system tables
-- Tables: payment_tokens, payments, sms_logs
-- ==========================================================================

-- ==========================================================================
-- 1. payment_tokens — liens de paiement sécurisés envoyés par SMS
-- ==========================================================================

create table public.payment_tokens (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  token text unique not null,                      -- 32 chars crypto-random
  expires_at timestamptz not null,                 -- lien valide 72h par défaut
  used boolean not null default false,             -- anti double-usage
  created_at timestamptz not null default now()
);
create index payment_tokens_restaurant_id_idx on public.payment_tokens(restaurant_id);
create index payment_tokens_token_idx on public.payment_tokens(token);
create index payment_tokens_expires_at_idx on public.payment_tokens(expires_at);

-- ==========================================================================
-- 2. payments — historique complet des paiements
-- ==========================================================================

create type public.payment_status as enum ('pending', 'success', 'failed');
create type public.payment_method as enum (
  'mobile_money', 'orange_money', 'mtn_money', 'wave', 'carte_bancaire', 'autre'
);

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  token_id uuid references public.payment_tokens(id) on delete set null,
  plan_key text not null,                          -- ex: '1_month', '3_months'
  amount integer not null check (amount > 0),      -- en FCFA
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  reference text unique not null,                  -- PAYyyMMddHHmm + random
  provider_ref text,                               -- référence agrégateur
  paid_at timestamptz,
  previous_expiry timestamptz,                     -- ancienne date expiration
  new_expiry timestamptz,                          -- nouvelle date calculée
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_restaurant_id_idx on public.payments(restaurant_id);
create index payments_status_idx on public.payments(status);
create index payments_reference_idx on public.payments(reference);

create trigger tr_payments_updated before update on public.payments
  for each row execute procedure extensions.moddatetime(updated_at);

-- ==========================================================================
-- 3. sms_logs — suivi des SMS envoyés (déduplication rappels)
-- ==========================================================================

create type public.sms_type as enum (
  'reminder_7d', 'reminder_5d', 'reminder_0d', 'payment_confirmation'
);

create table public.sms_logs (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  type public.sms_type not null,
  phone text not null,
  payload text,                                    -- contenu du SMS
  sent_at timestamptz not null default now()
);
create index sms_logs_restaurant_id_idx on public.sms_logs(restaurant_id);
-- Index de dédup : 1 seul rappel du même type par restaurant par jour
create unique index sms_logs_dedup_idx
  on public.sms_logs(restaurant_id, type, (sent_at::date));

-- ==========================================================================
-- RLS
-- ==========================================================================

alter table public.payment_tokens enable row level security;
alter table public.payments       enable row level security;
alter table public.sms_logs       enable row level security;

-- payment_tokens : lecture par le owner du restaurant ou superadmin
create policy "payment_tokens_owner_read" on public.payment_tokens
  for select using (public.owns_restaurant(auth.uid(), restaurant_id));

-- payment_tokens : lecture anonyme par token (pour la page /payment/[token])
create policy "payment_tokens_public_read_by_token" on public.payment_tokens
  for select using (true);

-- payments : owner + superadmin lecture
create policy "payments_owner_read" on public.payments
  for select using (public.owns_restaurant(auth.uid(), restaurant_id));
create policy "payments_superadmin_all" on public.payments
  for all using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- sms_logs : superadmin seulement
create policy "sms_logs_superadmin_read" on public.sms_logs
  for select using (public.is_superadmin(auth.uid()));
