-- ============================================================================
-- Patch : permet le filtrage par mois précis sur la page /dashboard/stats.
-- Ajoute restaurant_revenue_series(uuid, date, date) qui retourne le revenu
-- jour-par-jour sur une plage arbitraire (au lieu de "N derniers jours").
-- À exécuter une fois dans le SQL Editor Supabase.
-- ============================================================================

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
