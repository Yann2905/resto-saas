-- =====================================================
-- Migration : Extension Hôtel
-- =====================================================

-- 1. Type restaurant/hôtel
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'restaurant'
  CHECK (type IN ('restaurant', 'hotel', 'both'));

-- 2. Chambres d'hôtel (labels textuels)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS hotel_rooms text[] NOT NULL DEFAULT '{}';

-- 3. Services de chambre configurables
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS hotel_services jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Types de problèmes configurables
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS hotel_issues jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 5. Rendre table_number nullable (les hôtels utilisent room_label)
ALTER TABLE public.orders ALTER COLUMN table_number DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_table_number_check;

-- 6. Ajouter room_label et order_type
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS room_label text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'food'
  CHECK (order_type IN ('food', 'service', 'issue'));

-- 7. Contrainte : table_number OU room_label doit être présent
ALTER TABLE public.orders
  ADD CONSTRAINT orders_table_or_room_check
  CHECK (table_number > 0 OR room_label IS NOT NULL);

-- 8. Index sur room_label pour les hôtels
CREATE INDEX IF NOT EXISTS idx_orders_room_label ON public.orders(room_label) WHERE room_label IS NOT NULL;

-- 9. Chambres assignées aux serveurs d'hôtel
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_rooms text[] NOT NULL DEFAULT '{}';

-- 10. Mettre à jour le trigger d'assignation serveur pour supporter les hôtels
CREATE OR REPLACE FUNCTION public.assign_waiter_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_waiter_id uuid;
  v_restaurant_type text;
BEGIN
  SELECT type INTO v_restaurant_type
  FROM public.restaurants
  WHERE id = NEW.restaurant_id;

  IF v_restaurant_type IN ('hotel', 'both') AND NEW.room_label IS NOT NULL THEN
    SELECT id INTO v_waiter_id
    FROM public.profiles
    WHERE restaurant_id = NEW.restaurant_id
      AND role = 'waiter'
      AND NEW.room_label = ANY(assigned_rooms)
    LIMIT 1;
  ELSIF NEW.table_number IS NOT NULL THEN
    SELECT id INTO v_waiter_id
    FROM public.profiles
    WHERE restaurant_id = NEW.restaurant_id
      AND role = 'waiter'
      AND NEW.table_number = ANY(assigned_tables)
    LIMIT 1;
  END IF;

  IF v_waiter_id IS NOT NULL THEN
    NEW.assigned_to := v_waiter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. RPC : create_order avec support room_label
CREATE OR REPLACE FUNCTION public.create_order(
  p_restaurant_id uuid,
  p_table_number integer DEFAULT NULL,
  p_items jsonb DEFAULT NULL,
  p_room_label text DEFAULT NULL
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

  IF p_table_number IS NULL AND p_room_label IS NULL THEN
    RAISE EXCEPTION 'Table ou chambre requise';
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

  INSERT INTO public.orders(restaurant_id, table_number, room_label, items, total, status, order_type)
    VALUES (p_restaurant_id, p_table_number, p_room_label, v_order_items, v_total, 'pending', 'food')
    RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

-- Drop old grant and add new one with updated signature
DROP FUNCTION IF EXISTS public.create_order(uuid, integer, jsonb);
GRANT EXECUTE ON FUNCTION public.create_order(uuid, integer, jsonb, text) TO anon, authenticated;

-- 12. RPC : create_hotel_order — pour services de chambre et signalements
CREATE OR REPLACE FUNCTION public.create_hotel_order(
  p_restaurant_id uuid,
  p_room_label text,
  p_order_type text,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_active boolean;
  v_type text;
BEGIN
  IF p_order_type NOT IN ('service', 'issue') THEN
    RAISE EXCEPTION 'Type invalide';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun élément sélectionné';
  END IF;
  IF p_room_label IS NULL OR p_room_label = '' THEN
    RAISE EXCEPTION 'Chambre requise';
  END IF;

  SELECT active, type INTO v_active, v_type
  FROM public.restaurants WHERE id = p_restaurant_id;
  IF v_active IS NULL THEN RAISE EXCEPTION 'Établissement introuvable'; END IF;
  IF NOT v_active THEN RAISE EXCEPTION 'Établissement indisponible'; END IF;
  IF v_type NOT IN ('hotel', 'both') THEN RAISE EXCEPTION 'Réservé aux hôtels'; END IF;

  INSERT INTO public.orders(
    restaurant_id, room_label, items, total, status, order_type
  ) VALUES (
    p_restaurant_id, p_room_label, p_items, 0, 'pending', p_order_type
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_hotel_order(uuid, text, text, jsonb)
  TO anon, authenticated;
