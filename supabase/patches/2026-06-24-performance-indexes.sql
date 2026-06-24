-- =====================================================
-- Migration : Index de performance
-- =====================================================

-- Index sur orders par restaurant + status (requête la plus fréquente)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON public.orders (restaurant_id, status);

-- Index sur orders par restaurant + date de création (pour les served du jour)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON public.orders (restaurant_id, created_at DESC);

-- Index sur products par restaurant (chargement menu)
CREATE INDEX IF NOT EXISTS idx_products_restaurant
  ON public.products (restaurant_id, "order");

-- Index sur categories par restaurant
CREATE INDEX IF NOT EXISTS idx_categories_restaurant
  ON public.categories (restaurant_id, "order");

-- Index sur profiles par restaurant + role (lookup serveurs)
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_role
  ON public.profiles (restaurant_id, role);

-- Index sur push_subscriptions par restaurant (envoi push)
CREATE INDEX IF NOT EXISTS idx_push_subs_restaurant
  ON public.push_subscriptions (restaurant_id);

-- Index sur push_subscriptions par user (envoi push ciblé)
CREATE INDEX IF NOT EXISTS idx_push_subs_user
  ON public.push_subscriptions (user_id);

-- Index sur restaurants par slug (lookup menu client)
CREATE INDEX IF NOT EXISTS idx_restaurants_slug
  ON public.restaurants (slug);
