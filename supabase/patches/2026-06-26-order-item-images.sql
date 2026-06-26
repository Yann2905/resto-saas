-- 2026-06-26: Ajouter imageUrl aux items de commande
-- Le RPC create_order() inclut maintenant image_url du produit dans le JSONB items

CREATE OR REPLACE FUNCTION public.create_order(
  p_restaurant_id uuid,
  p_table_number integer,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_product record;
  v_line_total integer;
  v_total integer := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_active boolean;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  SELECT active INTO v_active FROM public.restaurants WHERE id = p_restaurant_id;
  IF v_active IS NULL THEN RAISE EXCEPTION 'Restaurant introuvable'; END IF;
  IF v_active = false THEN RAISE EXCEPTION 'Restaurant indisponible'; END IF;

  IF NOT public.is_restaurant_open(p_restaurant_id, now()) THEN
    RAISE EXCEPTION 'Restaurant fermé actuellement';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'productId')::uuid;
    v_qty := (v_item->>'quantity')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;

    SELECT id, name, price, image_url, available, stock_quantity
      INTO v_product
      FROM public.products
      WHERE id = v_pid AND restaurant_id = p_restaurant_id
      FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
    IF NOT v_product.available THEN
      RAISE EXCEPTION 'Indisponible: %', v_product.name;
    END IF;
    IF v_product.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour % (reste %)',
        v_product.name, v_product.stock_quantity;
    END IF;

    v_line_total := v_product.price * v_qty;
    v_total := v_total + v_line_total;

    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'name',      v_product.name,
      'price',     v_product.price,
      'quantity',  v_qty,
      'total',     v_line_total,
      'imageUrl',  v_product.image_url
    ));

    UPDATE public.products
      SET stock_quantity = stock_quantity - v_qty,
          available = CASE WHEN (stock_quantity - v_qty) > 0 THEN available ELSE false END
      WHERE id = v_product.id;
  END LOOP;

  INSERT INTO public.orders(restaurant_id, table_number, items, total, status)
    VALUES (p_restaurant_id, p_table_number, v_order_items, v_total, 'pending')
    RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;
