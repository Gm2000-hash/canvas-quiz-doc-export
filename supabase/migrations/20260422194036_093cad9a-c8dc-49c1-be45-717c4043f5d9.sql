ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS udl_supports jsonb NOT NULL DEFAULT '{}'::jsonb;