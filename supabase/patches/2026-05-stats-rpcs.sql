-- ============================================================================
-- Patch à exécuter UNE FOIS si tu as créé ta base avant l'ajout des stats.
-- ============================================================================
-- Symptôme : page /dashboard/stats vide ("0 jour affichés", "Pas encore de
-- ventes") même quand tu as des commandes servies.
-- Cause : les 3 RPCs ci-dessous n'ont jamais été créées dans ta base.
-- Sûr à relancer : tout est en CREATE OR REPLACE / IF NOT EXISTS.
-- ============================================================================

-- RPC : revenu jour par jour (pour le graphique en courbe)
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

-- RPC : top N produits par chiffre d'affaires
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

-- RPC : répartition horaire (24 buckets)
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

-- Bonus : si tu n'avais pas non plus REPLICA IDENTITY FULL (events DELETE
-- realtime cassés), c'est le moment.
alter table public.orders      replica identity full;
alter table public.products    replica identity full;
alter table public.categories  replica identity full;
alter table public.restaurants replica identity full;

-- Bonus : opening_hours si la colonne n'existait pas dans ta version initiale
alter table public.restaurants
  add column if not exists opening_hours jsonb;

-- is_restaurant_open : helper utilisé par create_order
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
  v_day := lower(to_char(p_at, 'dy'));
  v_today := v_hours->v_day;
  if v_today is null then return true; end if;
  if (v_today->>'closed')::boolean is true then return false; end if;
  v_now := p_at::time;
  v_open := (v_today->>'open')::time;
  v_close := (v_today->>'close')::time;
  if v_close < v_open then
    return v_now >= v_open or v_now < v_close;
  end if;
  return v_now >= v_open and v_now < v_close;
end;
$$;
grant execute on function public.is_restaurant_open(uuid, timestamptz) to anon, authenticated;
