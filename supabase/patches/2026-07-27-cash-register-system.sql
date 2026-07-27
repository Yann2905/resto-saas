-- ==========================================================================
-- Migration : Système de Caisse Enregistreuse & Encaissement de Commandes
-- ==========================================================================

-- 1. Table des sessions de caisse
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  opened_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  opening_float integer NOT NULL DEFAULT 0 CHECK (opening_float >= 0),
  closing_cash_actual integer CHECK (closing_cash_actual >= 0),
  closing_cash_expected integer CHECK (closing_cash_expected >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_restaurant ON public.cash_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON public.cash_sessions(opened_at DESC);

-- Trigger updated_at pour cash_sessions
CREATE TRIGGER tr_cash_sessions_updated BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- 2. Colonnes de paiement sur la table orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('cash', 'mobile_money', 'card', 'room_bill', 'other')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount_received integer CHECK (amount_received >= 0),
  ADD COLUMN IF NOT EXISTS change_given integer CHECK (change_given >= 0),
  ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_cash_session_id ON public.orders(cash_session_id) WHERE cash_session_id IS NOT NULL;

-- 3. Sécurité RLS pour cash_sessions
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_own_restaurant_cash_sessions" ON public.cash_sessions;
CREATE POLICY "staff_read_own_restaurant_cash_sessions"
  ON public.cash_sessions FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_insert_own_restaurant_cash_sessions" ON public.cash_sessions;
CREATE POLICY "staff_insert_own_restaurant_cash_sessions"
  ON public.cash_sessions FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_update_own_restaurant_cash_sessions" ON public.cash_sessions;
CREATE POLICY "staff_update_own_restaurant_cash_sessions"
  ON public.cash_sessions FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 4. RPC : Procédure d'encaissement atomique d'une commande
CREATE OR REPLACE FUNCTION public.process_order_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_session_id uuid;
  v_amount_rec integer;
  v_change integer := 0;
BEGIN
  -- 1. Récupérer la commande
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'La commande est déjà marquée comme payée';
  END IF;

  -- 2. Trouver la session de caisse ouverte pour le restaurant
  SELECT id INTO v_session_id
  FROM public.cash_sessions
  WHERE restaurant_id = v_order.restaurant_id
    AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  -- 3. Traiter le montant reçu et la monnaie
  IF p_payment_method = 'cash' THEN
    v_amount_rec := COALESCE(p_amount_received, v_order.total);
    IF v_amount_rec < v_order.total THEN
      RAISE EXCEPTION 'Le montant reçu (%) est inférieur au total de la commande (%)', v_amount_rec, v_order.total;
    END IF;
    v_change := v_amount_rec - v_order.total;
  ELSE
    v_amount_rec := v_order.total;
    v_change := 0;
  END IF;

  -- 4. Mettre à jour la commande
  UPDATE public.orders
  SET 
    payment_status = 'paid',
    payment_method = p_payment_method,
    paid_at = now(),
    amount_received = v_amount_rec,
    change_given = v_change,
    cash_session_id = v_session_id,
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total', v_order.total,
    'payment_method', p_payment_method,
    'amount_received', v_amount_rec,
    'change_given', v_change,
    'paid_at', now(),
    'cash_session_id', v_session_id
  );
END;
$$;

-- 5. RPC : Obtenir le résumé d'une session de caisse
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

  v_expected_cash := v_session.opening_float + v_total_cash;

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
    'expected_cash', v_expected_cash,
    'closing_cash_actual', v_session.closing_cash_actual,
    'closing_cash_expected', COALESCE(v_session.closing_cash_expected, v_expected_cash)
  );
END;
$$;
