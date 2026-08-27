-- Ajouter un type food/drink aux categories pour separer plats et boissons
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'food';

-- Pas de check constraint pour eviter les problemes si on ajoute d'autres types plus tard
