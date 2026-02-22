-- Add hero_image_filename to races for fast image GET (avoids storage.list).
-- Run this in Supabase Dashboard SQL Editor if you do not use Supabase CLI migrations.
ALTER TABLE races ADD COLUMN IF NOT EXISTS hero_image_filename text;
