-- Ajout de la colonne low_stock_threshold à la table restaurants
-- avec une valeur par défaut de 10.
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10;

NOTIFY pgrst, 'reload schema';
