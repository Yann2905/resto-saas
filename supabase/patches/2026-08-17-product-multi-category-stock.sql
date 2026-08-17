-- ============================================================
-- Product-level stock + multi-category stock links
-- ============================================================
-- 1. Junction table: a product can deduct stock from multiple categories
-- 2. stock_quantity on products becomes nullable (NULL = no plate tracking)
-- 3. create_order updated to use product_category_links

-- 1. Junction table
CREATE TABLE IF NOT EXISTS product_category_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  quantity_per_unit numeric NOT NULL DEFAULT 1 CHECK (quantity_per_unit > 0),
  UNIQUE(product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_pcl_product ON product_category_links(product_id);
CREATE INDEX IF NOT EXISTS idx_pcl_category ON product_category_links(category_id);

-- 2. Migrate existing relationships into the junction table
-- Products in categories that have stock management → create links
INSERT INTO product_category_links (product_id, category_id, quantity_per_unit)
SELECT p.id, p.category_id, COALESCE(p.stock_consumption, 1)
FROM products p
JOIN categories c ON c.id = p.category_id AND c.stock IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Make stock_quantity nullable (NULL = no plate-level tracking)
ALTER TABLE products ALTER COLUMN stock_quantity DROP NOT NULL;
ALTER TABLE products ALTER COLUMN stock_quantity DROP DEFAULT;
ALTER TABLE products ALTER COLUMN stock_quantity SET DEFAULT NULL;
-- Existing products that had stock_quantity = 0 and rely on category stock → set to NULL
UPDATE products SET stock_quantity = NULL
  WHERE stock_quantity = 0
    AND category_id IN (SELECT id FROM categories WHERE stock IS NOT NULL);

-- 4. Enable Realtime on the new table
ALTER PUBLICATION supabase_realtime ADD TABLE product_category_links;

-- 5. RLS: same access as products
ALTER TABLE product_category_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_category_links_read"
  ON product_category_links FOR SELECT
  USING (true);

CREATE POLICY "product_category_links_write"
  ON product_category_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_category_links.product_id
    )
  );

-- 6. Updated create_order RPC
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
  v_link record;
  v_line_total integer;
  v_total integer := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_active boolean;
  v_category_deductions jsonb := '{}'::jsonb;
  v_has_links boolean;
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

  -- ── First pass: validate stock & accumulate deductions ──
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

    -- Check product-level stock (if tracked)
    IF v_product.stock_quantity IS NOT NULL THEN
      IF v_product.stock_quantity < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant pour % (reste % plats)',
          v_product.name, v_product.stock_quantity;
      END IF;
    END IF;

    -- Accumulate category deductions from product_category_links
    v_has_links := false;
    FOR v_link IN
      SELECT pcl.category_id, pcl.quantity_per_unit
      FROM public.product_category_links pcl
      WHERE pcl.product_id = v_product.id
    LOOP
      v_has_links := true;
      -- Lock the category row
      PERFORM id FROM public.categories WHERE id = v_link.category_id FOR UPDATE;

      v_category_deductions := jsonb_set(
        v_category_deductions,
        ARRAY[v_link.category_id::text],
        to_jsonb(
          COALESCE((v_category_deductions->>v_link.category_id::text)::numeric, 0)
          + (v_link.quantity_per_unit * v_qty)
        )
      );
    END LOOP;

    -- Fallback: if no links exist, use legacy category_id + stock_consumption
    IF NOT v_has_links AND v_product.category_id IS NOT NULL THEN
      DECLARE v_cat_stock numeric;
      BEGIN
        SELECT stock INTO v_cat_stock FROM public.categories
          WHERE id = v_product.category_id FOR UPDATE;
        IF v_cat_stock IS NOT NULL THEN
          v_category_deductions := jsonb_set(
            v_category_deductions,
            ARRAY[v_product.category_id::text],
            to_jsonb(
              COALESCE((v_category_deductions->>v_product.category_id::text)::numeric, 0)
              + (COALESCE(v_product.stock_consumption, 1) * v_qty)
            )
          );
        END IF;
      END;
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

  -- ── Validate and apply category stock deductions ──
  DECLARE
    v_cat_id text;
    v_deduction numeric;
    v_current_stock numeric;
    v_cat_name text;
  BEGIN
    FOR v_cat_id, v_deduction IN SELECT * FROM jsonb_each_text(v_category_deductions) LOOP
      SELECT stock, name INTO v_current_stock, v_cat_name
        FROM public.categories WHERE id = v_cat_id::uuid;

      IF v_current_stock IS NOT NULL AND v_current_stock < v_deduction::numeric THEN
        RAISE EXCEPTION 'Stock insuffisant pour la catégorie % (reste %)',
          v_cat_name, v_current_stock;
      END IF;

      UPDATE public.categories
        SET stock = stock - v_deduction::numeric
        WHERE id = v_cat_id::uuid AND stock IS NOT NULL;
    END LOOP;
  END;

  -- ── Apply product-level stock deductions ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'productId')::uuid;
    v_qty := (v_item->>'quantity')::int;

    UPDATE public.products
      SET stock_quantity = stock_quantity - v_qty,
          available = CASE WHEN (stock_quantity - v_qty) > 0 THEN true ELSE false END
      WHERE id = v_pid
        AND stock_quantity IS NOT NULL;
  END LOOP;

  -- ── Add delivery fee ──
  IF p_order_mode = 'delivery' AND p_delivery_fee > 0 THEN
    v_total := v_total + p_delivery_fee;
  END IF;

  INSERT INTO public.orders(
    restaurant_id, table_number, room_label, items, total, status, order_type,
    order_mode, delivery_quartier, delivery_carrefour, delivery_phone, delivery_fee
  ) VALUES (
    p_restaurant_id, p_table_number, p_room_label, v_order_items, v_total, 'pending', 'food',
    p_order_mode, p_delivery_quartier, p_delivery_carrefour, p_delivery_phone, p_delivery_fee
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(uuid, integer, jsonb, text, text, text, text, text, integer) TO anon, authenticated;
