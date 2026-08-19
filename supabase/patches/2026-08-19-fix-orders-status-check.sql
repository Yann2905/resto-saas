-- Fix: ajouter "cancelled" au check constraint sur orders.status

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled'));
