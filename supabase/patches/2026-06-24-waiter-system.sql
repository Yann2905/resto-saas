-- =====================================================
-- Migration : Système serveurs + assignation commandes
-- =====================================================

-- 1. Étendre les rôles pour inclure 'waiter'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'superadmin', 'waiter'));

-- 2. Ajouter display_name et assigned_tables aux profils
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_tables integer[] NOT NULL DEFAULT '{}';

-- 3. Colonnes d'assignation sur les commandes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

-- 4. Index pour retrouver rapidement les commandes d'un serveur
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to) WHERE assigned_to IS NOT NULL;

-- 5. RLS : les serveurs peuvent lire les commandes de leur restaurant
DROP POLICY IF EXISTS "waiters_read_own_restaurant_orders" ON public.orders;
CREATE POLICY "waiters_read_own_restaurant_orders"
  ON public.orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 6. RLS : les serveurs peuvent mettre à jour acknowledged_at sur leurs commandes
DROP POLICY IF EXISTS "waiters_acknowledge_orders" ON public.orders;
CREATE POLICY "waiters_acknowledge_orders"
  ON public.orders FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 7. Trigger : auto-assigner le serveur quand une commande est créée
CREATE OR REPLACE FUNCTION public.assign_waiter_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_waiter_id uuid;
BEGIN
  -- Chercher un serveur dont assigned_tables contient ce numéro de table
  SELECT id INTO v_waiter_id
  FROM public.profiles
  WHERE restaurant_id = NEW.restaurant_id
    AND role = 'waiter'
    AND NEW.table_number = ANY(assigned_tables)
  LIMIT 1;

  IF v_waiter_id IS NOT NULL THEN
    NEW.assigned_to := v_waiter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_waiter ON public.orders;
CREATE TRIGGER trg_assign_waiter
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_waiter_on_order();

-- 8. Table pour stocker les subscriptions Web Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
