ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;