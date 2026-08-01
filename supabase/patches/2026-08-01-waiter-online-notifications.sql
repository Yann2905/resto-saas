-- ==========================================================================
-- Migration : Notifications serveurs basées sur le statut en ligne
-- ==========================================================================

-- 1. Mettre à jour le trigger d'auto-assignation pour préférer les serveurs en ligne
CREATE OR REPLACE FUNCTION public.assign_waiter_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_waiter_id uuid;
BEGIN
  -- D'abord : serveur en ligne couvrant cette table
  SELECT id INTO v_waiter_id
  FROM public.profiles
  WHERE restaurant_id = NEW.restaurant_id
    AND role = 'waiter'
    AND is_online = true
    AND NEW.table_number = ANY(assigned_tables)
  LIMIT 1;

  -- Fallback : n'importe quel serveur couvrant cette table
  IF v_waiter_id IS NULL THEN
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
