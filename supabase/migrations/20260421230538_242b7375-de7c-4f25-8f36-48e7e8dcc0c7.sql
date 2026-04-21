
-- Notes table for Notion-style nested pages
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  icon text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_text text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  share_token text UNIQUE,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_parent_id ON public.notes(parent_id);
CREATE INDEX idx_notes_tags ON public.notes USING GIN(tags);

-- Full-text search
ALTER TABLE public.notes ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
  ) STORED;
CREATE INDEX idx_notes_search ON public.notes USING GIN(search_vector);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Backlinks
CREATE TABLE public.note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_note_id, target_note_id)
);

CREATE INDEX idx_note_links_source ON public.note_links(source_note_id);
CREATE INDEX idx_note_links_target ON public.note_links(target_note_id);

ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own note links" ON public.note_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_links.source_note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can insert own note links" ON public.note_links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_links.source_note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can delete own note links" ON public.note_links FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_links.source_note_id AND notes.user_id = auth.uid()));

-- Public share RPC
CREATE OR REPLACE FUNCTION public.get_shared_note(_token text)
RETURNS TABLE(
  id uuid,
  title text,
  icon text,
  content jsonb,
  tags text[],
  updated_at timestamptz,
  author_display_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id, n.title, n.icon, n.content, n.tags, n.updated_at,
         coalesce(p.display_name, '')
  FROM public.notes n
  LEFT JOIN public.profiles p ON p.user_id = n.user_id
  WHERE n.share_token = _token AND n.is_public = true
  LIMIT 1;
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
