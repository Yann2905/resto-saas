-- ==========================================================================
-- Migration : Sorties de caisse, estimation livraison, avis clients
-- ==========================================================================

-- 1. Table des sorties/dépenses de caisse
CREATE TABLE IF NOT EXISTS public.cash_expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_expenses_session ON public.cash_expenses(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_expenses_restaurant ON public.cash_expenses(restaurant_id);

ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_own_expenses" ON public.cash_expenses;
CREATE POLICY "staff_read_own_expenses"
  ON public.cash_expenses FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "staff_insert_own_expenses" ON public.cash_expenses;
CREATE POLICY "staff_insert_own_expenses"
  ON public.cash_expenses FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

-- 2. Mise à jour du RPC get_cash_session_summary pour inclure les dépenses
CREATE OR REPLACE FUNCTION public.get_cash_session_summary(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session public.cash_sessions%ROWTYPE;
  v_total_cash integer := 0;
  v_total_momo integer := 0;
  v_total_card integer := 0;
  v_total_other integer := 0;
  v_total_sales integer := 0;
  v_orders_count integer := 0;
  v_total_expenses integer := 0;
  v_expected_cash integer := 0;
BEGIN
  SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session de caisse introuvable';
  END IF;

  SELECT
    COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash'), 0),
    COALESCE(SUM(total) FILTER (WHERE payment_method = 'mobile_money'), 0),
    COALESCE(SUM(total) FILTER (WHERE payment_method = 'card'), 0),
    COALESCE(SUM(total) FILTER (WHERE payment_method NOT IN ('cash', 'mobile_money', 'card')), 0),
    COALESCE(SUM(total), 0),
    COUNT(*)
  INTO v_total_cash, v_total_momo, v_total_card, v_total_other, v_total_sales, v_orders_count
  FROM public.orders
  WHERE cash_session_id = p_session_id AND payment_status = 'paid';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.cash_expenses
  WHERE cash_session_id = p_session_id;

  v_expected_cash := v_session.opening_float + v_total_cash - v_total_expenses;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'restaurant_id', v_session.restaurant_id,
    'status', v_session.status,
    'opening_float', v_session.opening_float,
    'opened_at', v_session.opened_at,
    'closed_at', v_session.closed_at,
    'total_cash', v_total_cash,
    'total_momo', v_total_momo,
    'total_card', v_total_card,
    'total_other', v_total_other,
    'total_sales', v_total_sales,
    'orders_count', v_orders_count,
    'total_expenses', v_total_expenses,
    'expected_cash', v_expected_cash,
    'closing_cash_actual', v_session.closing_cash_actual,
    'closing_cash_expected', COALESCE(v_session.closing_cash_expected, v_expected_cash)
  );
END;
$$;

-- 3. Estimation temps de livraison
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS estimated_delivery_minutes integer DEFAULT 30;

-- 4. Système d'avis clients
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT 'Client',
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON public.reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON public.reviews(order_id) WHERE order_id IS NOT NULL;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_reviews" ON public.reviews;
CREATE POLICY "anyone_can_read_reviews"
  ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "anyone_can_insert_reviews" ON public.reviews;
CREATE POLICY "anyone_can_insert_reviews"
  ON public.reviews FOR INSERT WITH CHECK (true);

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS avg_rating numeric(2,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
