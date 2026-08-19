-- 2026-08-19: Annulation de commande (remet le stock) + reset stats

-- ============================================================
-- 1. Fonction cancel_order : annule une commande et remet le stock
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order record;
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_product record;
  v_link record;
  v_has_links boolean;
BEGIN
  -- Lock and fetch the order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Commande déjà annulée';
  END IF;

  -- Reverse stock deductions for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    v_pid := (v_item->>'productId')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 1);

    -- Get product info
    SELECT id, category_id, stock_quantity, stock_consumption
      INTO v_product
      FROM public.products
      WHERE id = v_pid;

    IF NOT FOUND THEN CONTINUE; END IF;

    -- Reverse product-level stock
    IF v_product.stock_quantity IS NOT NULL THEN
      UPDATE public.products
        SET stock_quantity = stock_quantity + v_qty,
            available = true
        WHERE id = v_pid;
    END IF;

    -- Reverse category stock from product_category_links
    v_has_links := false;
    FOR v_link IN
      SELECT pcl.category_id, pcl.quantity_per_unit
      FROM public.product_category_links pcl
      WHERE pcl.product_id = v_pid
    LOOP
      v_has_links := true;
      UPDATE public.categories
        SET stock = stock + (v_link.quantity_per_unit * v_qty)
        WHERE id = v_link.category_id AND stock IS NOT NULL;
    END LOOP;

    -- Fallback: legacy single-category deduction
    IF NOT v_has_links AND v_product.category_id IS NOT NULL THEN
      UPDATE public.categories
        SET stock = stock + (COALESCE(v_product.stock_consumption, 1) * v_qty)
        WHERE id = v_product.category_id AND stock IS NOT NULL;
    END IF;
  END LOOP;

  -- Set order status to cancelled
  UPDATE public.orders SET status = 'cancelled' WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;

-- ============================================================
-- 2. Fonction reset_restaurant_stats : supprime commandes,
--    sessions de caisse et dépenses
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_restaurant_stats(
  p_restaurant_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Delete expenses (linked to cash sessions)
  DELETE FROM public.cash_expenses WHERE restaurant_id = p_restaurant_id;

  -- Delete cash sessions
  DELETE FROM public.cash_sessions WHERE restaurant_id = p_restaurant_id;

  -- Delete orders
  DELETE FROM public.orders WHERE restaurant_id = p_restaurant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_restaurant_stats(uuid) TO authenticated;
