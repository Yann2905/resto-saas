-- ==========================================================================
-- Resto SaaS — Supabase schema (complet)
-- À exécuter dans le SQL Editor d'un projet Supabase frais.
-- ==========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists moddatetime schema extensions;

-- ==========================================================================
-- Tables
-- ==========================================================================

create table public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  address text,
  phone text,
  logo_url text,
  active boolean not null default true,
  subscription_expires_at timestamptz,
  -- {"mon":{"open":"08:00","close":"22:00","closed":false}, ...}
  -- null = ouvert 24/7
  opening_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_restaurant_id_idx on public.categories(restaurant_id);

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0),
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  available boolean not null default true,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_restaurant_id_idx on public.products(restaurant_id);
create index products_category_id_idx on public.products(category_id);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number integer not null check (table_number > 0),
  items jsonb not null,
  total integer not null check (total >= 0),
  status text not null default 'pending' check (status in ('pending','preparing','ready','served')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_restaurant_id_idx on public.orders(restaurant_id);
create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  role text not null check (role in ('owner','superadmin')),
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_restaurant_id_idx on public.profiles(restaurant_id);

-- ==========================================================================
-- updated_at triggers
-- ==========================================================================

create trigger tr_restaurants_updated before update on public.restaurants
  for each row execute procedure extensions.moddatetime(updated_at);
create trigger tr_categories_updated before update on public.categories
  for each row execute procedure extensions.moddatetime(updated_at);
create trigger tr_products_updated before update on public.products
  for each row execute procedure extensions.moddatetime(updated_at);
create trigger tr_orders_updated before update on public.orders
  for each row execute procedure extensions.moddatetime(updated_at);
create trigger tr_profiles_updated before update on public.profiles
  for each row execute procedure extensions.moddatetime(updated_at);

-- ==========================================================================
-- Helpers (utilisés par RLS + RPC)
-- ==========================================================================

create or replace function public.is_superadmin(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'superadmin'
  );
$$;

create or replace function public.owns_restaurant(uid uuid, rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = uid and restaurant_id = rid and role in ('owner','superadmin')
  ) or public.is_superadmin(uid);
$$;

-- is_restaurant_open : check opening_hours, fallback true si null
create or replace function public.is_restaurant_open(p_restaurant_id uuid, p_at timestamptz default now())
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_hours jsonb;
  v_day text;
  v_today jsonb;
  v_open time;
  v_close time;
  v_now time;
begin
  select opening_hours into v_hours from public.restaurants where id = p_restaurant_id;
  if v_hours is null then return true; end if;

  v_day := lower(to_char(p_at, 'dy'));  -- mon,tue,wed...
  v_today := v_hours->v_day;
  if v_today is null then return true; end if;
  if (v_today->>'closed')::boolean is true then return false; end if;

  v_now := p_at::time;
  v_open := (v_today->>'open')::time;
  v_close := (v_today->>'close')::time;

  if v_close < v_open then
    -- overnight (ex: 18:00 → 02:00)
    return v_now >= v_open or v_now < v_close;
  end if;
  return v_now >= v_open and v_now < v_close;
end;
$$;

grant execute on function public.is_restaurant_open(uuid, timestamptz) to anon, authenticated;

-- ==========================================================================
-- Row Level Security
-- ==========================================================================

alter table public.restaurants enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.profiles    enable row level security;

-- ---- restaurants ----
create policy "restaurants_public_read_active" on public.restaurants
  for select using (active = true);
create policy "restaurants_owner_read" on public.restaurants
  for select using (public.owns_restaurant(auth.uid(), id));
create policy "restaurants_owner_update" on public.restaurants
  for update using (public.owns_restaurant(auth.uid(), id));
create policy "restaurants_superadmin_all" on public.restaurants
  for all using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- ---- categories ----
create policy "categories_public_read" on public.categories
  for select using (
    exists (select 1 from public.restaurants r
            where r.id = categories.restaurant_id and r.active = true)
  );
create policy "categories_owner_all" on public.categories
  for all using (public.owns_restaurant(auth.uid(), restaurant_id))
  with check (public.owns_restaurant(auth.uid(), restaurant_id));

-- ---- products ----
create policy "products_public_read" on public.products
  for select using (
    exists (select 1 from public.restaurants r
            where r.id = products.restaurant_id and r.active = true)
  );
create policy "products_owner_all" on public.products
  for all using (public.owns_restaurant(auth.uid(), restaurant_id))
  with check (public.owns_restaurant(auth.uid(), restaurant_id));

-- ---- orders ----
-- Insert : l'anonyme (client à table) peut créer une commande via la RPC
-- create_order, qui est SECURITY DEFINER et bypasse RLS. Insert direct
-- aussi autorisé en fallback, scoped au restaurant actif.
create policy "orders_public_insert" on public.orders
  for insert with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.active = true)
  );

-- Select : ouvert. Nécessaire pour que le client suive sa commande via
-- l'URL contenant l'UUID v4 (cryptographiquement secret). Trade-off :
-- avec l'anon key, un acteur malveillant peut lister TOUTES les commandes
-- de TOUS les restos. Information modérée (table, items, total, statut)
-- — pas de PII client. À durcir plus tard via :
--   1) RPC publique get_order_public(p_id uuid) + RLS owner-only
--   2) Supabase Broadcast au lieu de postgres_changes pour le tracker client
create policy "orders_public_read" on public.orders
  for select using (true);

create policy "orders_owner_update" on public.orders
  for update using (public.owns_restaurant(auth.uid(), restaurant_id));

-- ---- profiles ----
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_superadmin_all" on public.profiles
  for all using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- ==========================================================================
-- RPC : create_order — atomique (stock + horaires + insert)
-- ==========================================================================

create or replace function public.create_order(
  p_restaurant_id uuid,
  p_table_number integer,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_product record;
  v_line_total integer;
  v_total integer := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_active boolean;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Panier vide';
  end if;

  select active into v_active from public.restaurants where id = p_restaurant_id;
  if v_active is null then raise exception 'Restaurant introuvable'; end if;
  if v_active = false then raise exception 'Restaurant indisponible'; end if;

  if not public.is_restaurant_open(p_restaurant_id, now()) then
    raise exception 'Restaurant fermé actuellement';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'productId')::uuid;
    v_qty := (v_item->>'quantity')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantité invalide';
    end if;

    select id, name, price, available, stock_quantity
      into v_product
      from public.products
      where id = v_pid and restaurant_id = p_restaurant_id
      for update;

    if not found then raise exception 'Produit introuvable'; end if;
    if not v_product.available then
      raise exception 'Indisponible: %', v_product.name;
    end if;
    if v_product.stock_quantity < v_qty then
      raise exception 'Stock insuffisant pour % (reste %)',
        v_product.name, v_product.stock_quantity;
    end if;

    v_line_total := v_product.price * v_qty;
    v_total := v_total + v_line_total;

    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'name',      v_product.name,
      'price',     v_product.price,
      'quantity',  v_qty,
      'total',     v_line_total
    ));

    update public.products
      set stock_quantity = stock_quantity - v_qty,
          available = case when (stock_quantity - v_qty) > 0 then available else false end
      where id = v_product.id;
  end loop;

  insert into public.orders(restaurant_id, table_number, items, total, status)
    values (p_restaurant_id, p_table_number, v_order_items, v_total, 'pending')
    returning id into v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(uuid, integer, jsonb) to anon, authenticated;

-- ==========================================================================
-- RPC : restaurant_stats — CA + commandes + ticket moyen sur période
-- ==========================================================================

create or replace function public.restaurant_stats(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table(
  total_revenue bigint,
  total_orders bigint,
  avg_ticket numeric
) language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(total), 0)::bigint as total_revenue,
    count(*)::bigint as total_orders,
    case when count(*) = 0 then 0 else (sum(total)::numeric / count(*)) end as avg_ticket
  from public.orders
  where restaurant_id = p_restaurant_id
    and created_at >= p_from
    and created_at <  p_to
    and status <> 'pending';
$$;

grant execute on function public.restaurant_stats(uuid, timestamptz, timestamptz)
  to authenticated;

-- ==========================================================================
-- RPC : restaurant_revenue_by_day — séries jour par jour pour graphique
-- ==========================================================================

create or replace function public.restaurant_revenue_by_day(
  p_restaurant_id uuid,
  p_days integer default 14
) returns table(
  day date,
  revenue bigint,
  orders_count bigint
) language sql stable security definer set search_path = public as $$
  with series as (
    select generate_series(
      (current_date - (p_days - 1))::date,
      current_date::date,
      interval '1 day'
    )::date as day
  )
  select
    s.day,
    coalesce(sum(o.total), 0)::bigint as revenue,
    coalesce(count(o.id), 0)::bigint as orders_count
  from series s
  left join public.orders o
    on o.restaurant_id = p_restaurant_id
    and o.created_at::date = s.day
    and o.status <> 'pending'
  group by s.day
  order by s.day;
$$;

grant execute on function public.restaurant_revenue_by_day(uuid, integer)
  to authenticated;

-- Variante avec plage arbitraire (utilisée pour le sélecteur de mois)
create or replace function public.restaurant_revenue_series(
  p_restaurant_id uuid,
  p_from date,
  p_to date
) returns table(
  day date,
  revenue bigint,
  orders_count bigint
) language sql stable security definer set search_path = public as $$
  with series as (
    select generate_series(p_from::date, p_to::date, interval '1 day')::date as day
  )
  select
    s.day,
    coalesce(sum(o.total), 0)::bigint as revenue,
    coalesce(count(o.id), 0)::bigint as orders_count
  from series s
  left join public.orders o
    on o.restaurant_id = p_restaurant_id
    and o.created_at::date = s.day
    and o.status <> 'pending'
  group by s.day
  order by s.day;
$$;

grant execute on function public.restaurant_revenue_series(uuid, date, date)
  to authenticated;

-- ==========================================================================
-- RPC : restaurant_top_products — top N produits par revenu
-- ==========================================================================

create or replace function public.restaurant_top_products(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 5
) returns table(
  product_id uuid,
  product_name text,
  qty_sold bigint,
  revenue bigint
) language sql stable security definer set search_path = public as $$
  select
    (item->>'productId')::uuid as product_id,
    item->>'name' as product_name,
    sum((item->>'quantity')::int)::bigint as qty_sold,
    sum((item->>'total')::int)::bigint as revenue
  from public.orders, jsonb_array_elements(items) as item
  where restaurant_id = p_restaurant_id
    and created_at >= p_from
    and created_at <  p_to
    and status <> 'pending'
  group by product_id, product_name
  order by revenue desc
  limit p_limit;
$$;

grant execute on function public.restaurant_top_products(uuid, timestamptz, timestamptz, integer)
  to authenticated;

-- ==========================================================================
-- RPC : restaurant_peak_hours — répartition horaire (24 buckets)
-- ==========================================================================

create or replace function public.restaurant_peak_hours(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table(hour integer, orders_count bigint, revenue bigint)
language sql stable security definer set search_path = public as $$
  with hours as (select generate_series(0, 23) as hour)
  select
    h.hour,
    coalesce(count(o.id), 0)::bigint as orders_count,
    coalesce(sum(o.total), 0)::bigint as revenue
  from hours h
  left join public.orders o
    on o.restaurant_id = p_restaurant_id
    and extract(hour from o.created_at)::int = h.hour
    and o.created_at >= p_from
    and o.created_at <  p_to
    and o.status <> 'pending'
  group by h.hour
  order by h.hour;
$$;

grant execute on function public.restaurant_peak_hours(uuid, timestamptz, timestamptz)
  to authenticated;

-- ==========================================================================
-- Realtime
-- ==========================================================================

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.restaurants;

-- REPLICA IDENTITY FULL : nécessaire pour que les events DELETE et les
-- filtres realtime sur des colonnes non-PK (ex: restaurant_id) marchent.
alter table public.orders      replica identity full;
alter table public.products    replica identity full;
alter table public.categories  replica identity full;
alter table public.restaurants replica identity full;

-- ==========================================================================
-- Storage buckets
-- ==========================================================================

insert into storage.buckets (id, name, public)
  values ('products', 'products', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true) on conflict (id) do nothing;

create policy "products_upload_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'products'
    and public.owns_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
create policy "products_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'products'
    and public.owns_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
create policy "products_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'products'
    and public.owns_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

create policy "logos_upload_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'logos'
    and public.owns_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
create policy "logos_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'logos'
    and public.owns_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
create policy "logos_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'logos'
    and public.owns_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- ==========================================================================
-- Bootstrap : créer un superadmin
-- ==========================================================================
-- 1) Dashboard Supabase → Auth → Users → "Add user" → admin@restosaas.com
-- 2) Récupère son UID puis exécute :
--
--   insert into public.profiles (id, role, email)
--   values ('<UID>', 'superadmin', 'admin@restosaas.com');
