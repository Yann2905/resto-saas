-- 2026-08-19: Menu du jour + catégories visibles côté client
-- Ajouter is_daily sur les produits (menu du jour)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_daily boolean NOT NULL DEFAULT false;

-- Ajouter visible_to_client sur les catégories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible_to_client boolean NOT NULL DEFAULT true;
