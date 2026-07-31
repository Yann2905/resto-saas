-- 1. Product descriptions
ALTER TABLE products ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- 2. Delivery system
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee integer NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_mode text NOT NULL DEFAULT 'dine_in' CHECK (order_mode IN ('dine_in', 'delivery'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_quartier text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_carrefour text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee integer NOT NULL DEFAULT 0;

-- 3. Update create_order RPC to support delivery
CREATE OR REPLACE FUNCTION public.create_order(
  p_restaurant_id uuid,
  p_table_number integer DEFAULT NULL,
  p_items jsonb DEFAULT NULL,
  p_room_label text DEFAULT NULL,
  p_order_mode text DEFAULT 'dine_in',
  p_delivery_quartier text DEFAULT NULL,
  p_delivery_carrefour text DEFAULT NULL,
  p_delivery_phone text DEFAULT NULL,
  p_delivery_fee integer DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_product record;
  v_category record;
  v_line_total integer;
  v_total integer := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_active boolean;
  v_consumption numeric;
  v_category_deductions jsonb := '{}'::jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  IF p_order_mode = 'delivery' THEN
    IF p_delivery_phone IS NULL OR p_delivery_phone = '' THEN
      RAISE EXCEPTION 'Numéro de téléphone requis pour la livraison';
    END IF;
    IF p_delivery_quartier IS NULL OR p_delivery_quartier = '' THEN
      RAISE EXCEPTION 'Quartier requis pour la livraison';
    END IF;
  ELSE
    IF p_table_number IS NULL AND p_room_label IS NULL THEN
      RAISE EXCEPTION 'Table ou chambre requise';
    END IF;
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

    SELECT id, name, price, image_url, available, stock_quantity, category_id, stock_consumption
      INTO v_product
      FROM public.products
      WHERE id = v_pid AND restaurant_id = p_restaurant_id
      FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
    IF NOT v_product.available THEN
      RAISE EXCEPTION 'Indisponible: %', v_product.name;
    END IF;

    v_category := NULL;
    IF v_product.category_id IS NOT NULL THEN
      SELECT id, stock INTO v_category
        FROM public.categories
        WHERE id = v_product.category_id
        FOR UPDATE;
    END IF;

    v_consumption := COALESCE(v_product.stock_consumption, 1);

    IF v_category IS NOT NULL AND v_category.stock IS NOT NULL THEN
      v_category_deductions := jsonb_set(
        v_category_deductions,
        ARRAY[v_category.id::text],
        to_jsonb(COALESCE((v_category_deductions->>v_category.id::text)::numeric, 0) + (v_consumption * v_qty))
      );
    ELSE
      IF v_product.stock_quantity < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant pour % (reste %)',
          v_product.name, v_product.stock_quantity;
      END IF;
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
  END LOOP;

  -- Validate and apply category stock deductions
  DECLARE
    v_cat_id text;
    v_deduction numeric;
    v_current_stock numeric;
    v_cat_name text;
  BEGIN
    FOR v_cat_id, v_deduction IN SELECT * FROM jsonb_each_text(v_category_deductions) LOOP
      SELECT stock, name INTO v_current_stock, v_cat_name
        FROM public.categories WHERE id = v_cat_id::uuid;
      IF v_current_stock < v_deduction::numeric THEN
        RAISE EXCEPTION 'Stock insuffisant pour la catégorie % (reste %)',
          v_cat_name, v_current_stock;
      END IF;
      UPDATE public.categories
        SET stock = stock - v_deduction::numeric
        WHERE id = v_cat_id::uuid;
    END LOOP;
  END;

  -- Apply product-level stock deductions
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'productId')::uuid;
    v_qty := (v_item->>'quantity')::int;
    SELECT id, category_id INTO v_product FROM public.products WHERE id = v_pid;
    IF v_product.category_id IS NULL OR
       NOT EXISTS (SELECT 1 FROM public.categories WHERE id = v_product.category_id AND stock IS NOT NULL) THEN
      UPDATE public.products
        SET stock_quantity = stock_quantity - v_qty,
            available = CASE WHEN (stock_quantity - v_qty) > 0 THEN available ELSE false END
        WHERE id = v_product.id;
    END IF;
  END LOOP;

  -- Add delivery fee to total
  IF p_order_mode = 'delivery' AND p_delivery_fee > 0 THEN
    v_total := v_total + p_delivery_fee;
  END IF;

  INSERT INTO public.orders(restaurant_id, table_number, room_label, items, total, status, order_type, order_mode, delivery_quartier, delivery_carrefour, delivery_phone, delivery_fee)
    VALUES (p_restaurant_id, p_table_number, p_room_label, v_order_items, v_total, 'pending', 'food', p_order_mode, p_delivery_quartier, p_delivery_carrefour, p_delivery_phone, p_delivery_fee)
    RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(uuid, integer, jsonb, text, text, text, text, text, integer) TO anon, authenticated;
