-- Paiement mixte : une partie en espèces, l'autre en mobile money

-- 0. Mettre à jour la contrainte payment_method pour inclure 'mixed'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash', 'mobile_money', 'card', 'room_bill', 'other', 'mixed'));

-- 1. Ajouter les colonnes de répartition
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cash_amount integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS momo_amount integer DEFAULT NULL;

-- 2. Mettre à jour la RPC process_order_payment pour le paiement mixte
CREATE OR REPLACE FUNCTION public.process_order_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received integer DEFAULT NULL,
  p_payment_provider text DEFAULT NULL,
  p_cash_amount integer DEFAULT NULL,
  p_momo_amount integer DEFAULT NULL
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
  v_cash_amount integer := 0;
  v_momo_amount integer := 0;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'La commande est déjà marquée comme payée';
  END IF;

  SELECT id INTO v_session_id
  FROM public.cash_sessions
  WHERE restaurant_id = v_order.restaurant_id
    AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF p_payment_method = 'cash' THEN
    v_amount_rec := COALESCE(p_amount_received, v_order.total);
    IF v_amount_rec < v_order.total THEN
      RAISE EXCEPTION 'Le montant reçu (%) est inférieur au total (%)', v_amount_rec, v_order.total;
    END IF;
    v_change := v_amount_rec - v_order.total;
    v_cash_amount := v_order.total;
    v_momo_amount := 0;

  ELSIF p_payment_method = 'mixed' THEN
    -- Paiement mixte : cash + momo
    v_cash_amount := COALESCE(p_cash_amount, 0);
    v_momo_amount := COALESCE(p_momo_amount, 0);

    IF v_cash_amount + v_momo_amount < v_order.total THEN
      RAISE EXCEPTION 'La somme cash (%) + momo (%) est inférieure au total (%)',
        v_cash_amount, v_momo_amount, v_order.total;
    END IF;

    -- Le client peut donner plus en cash que la part cash
    v_amount_rec := COALESCE(p_amount_received, v_cash_amount);
    v_change := v_amount_rec - v_cash_amount;

  ELSE
    -- mobile_money, card, room_bill, other
    v_amount_rec := v_order.total;
    v_change := 0;
    v_cash_amount := 0;
    v_momo_amount := CASE WHEN p_payment_method = 'mobile_money' THEN v_order.total ELSE 0 END;
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'paid',
    payment_method = p_payment_method,
    payment_provider = CASE
      WHEN p_payment_method IN ('mobile_money', 'mixed') THEN p_payment_provider
      ELSE NULL
    END,
    paid_at = now(),
    amount_received = v_amount_rec,
    change_given = v_change,
    cash_amount = v_cash_amount,
    momo_amount = v_momo_amount,
    cash_session_id = v_session_id,
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total', v_order.total,
    'payment_method', p_payment_method,
    'payment_provider', p_payment_provider,
    'amount_received', v_amount_rec,
    'change_given', v_change,
    'cash_amount', v_cash_amount,
    'momo_amount', v_momo_amount,
    'paid_at', now()
  );
END;
$$;

-- 3. Mettre à jour get_cash_session_summary pour ventiler correctement les paiements mixtes
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
  v_momo_orange integer := 0;
  v_momo_wave integer := 0;
  v_momo_mtn integer := 0;
  v_momo_moov integer := 0;
BEGIN
  SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session de caisse introuvable';
  END IF;

  -- Calculer les totaux en tenant compte des paiements mixtes
  -- Pour les paiements mixtes, on utilise cash_amount et momo_amount
  -- Pour les paiements simples, on utilise le total complet
  SELECT
    COALESCE(SUM(
      CASE
        WHEN payment_method = 'cash' THEN total
        WHEN payment_method = 'mixed' THEN COALESCE(cash_amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN payment_method = 'mobile_money' THEN total
        WHEN payment_method = 'mixed' THEN COALESCE(momo_amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(total) FILTER (WHERE payment_method = 'card'), 0),
    COALESCE(SUM(total) FILTER (WHERE payment_method NOT IN ('cash', 'mobile_money', 'card', 'mixed')), 0),
    COALESCE(SUM(total), 0),
    COUNT(*),
    COALESCE(SUM(
      CASE
        WHEN payment_method = 'mobile_money' AND payment_provider = 'orange_money' THEN total
        WHEN payment_method = 'mixed' AND payment_provider = 'orange_money' THEN COALESCE(momo_amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN payment_method = 'mobile_money' AND payment_provider = 'wave' THEN total
        WHEN payment_method = 'mixed' AND payment_provider = 'wave' THEN COALESCE(momo_amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN payment_method = 'mobile_money' AND payment_provider = 'mtn_money' THEN total
        WHEN payment_method = 'mixed' AND payment_provider = 'mtn_money' THEN COALESCE(momo_amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN payment_method = 'mobile_money' AND payment_provider = 'moov_money' THEN total
        WHEN payment_method = 'mixed' AND payment_provider = 'moov_money' THEN COALESCE(momo_amount, 0)
        ELSE 0
      END
    ), 0)
  INTO v_total_cash, v_total_momo, v_total_card, v_total_other, v_total_sales, v_orders_count,
       v_momo_orange, v_momo_wave, v_momo_mtn, v_momo_moov
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
    'closing_cash_expected', COALESCE(v_session.closing_cash_expected, v_expected_cash),
    'momo_orange', v_momo_orange,
    'momo_wave', v_momo_wave,
    'momo_mtn', v_momo_mtn,
    'momo_moov', v_momo_moov
  );
END;
$$;
