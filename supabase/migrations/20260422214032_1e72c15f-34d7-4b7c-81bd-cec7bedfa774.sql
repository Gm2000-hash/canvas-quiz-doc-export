-- Add widgets and hidden_sections columns to theme_customizations
-- widgets: array of widget objects { id, type, content, styles, sort_order }
-- hidden_sections: array of section keys the user has hidden on this scope
ALTER TABLE public.theme_customizations
  ADD COLUMN IF NOT EXISTS widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hidden_sections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index for fast lookup of a user's customizations for a given scope
CREATE INDEX IF NOT EXISTS theme_customizations_user_scope_idx
  ON public.theme_customizations (user_id, scope_type, scope_key);
