CREATE TABLE public.standard_key_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  standard_code text NOT NULL,
  key_terms text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, standard_code)
);

ALTER TABLE public.standard_key_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own key terms"
ON public.standard_key_terms FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own key terms"
ON public.standard_key_terms FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own key terms"
ON public.standard_key_terms FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own key terms"
ON public.standard_key_terms FOR DELETE TO authenticated
USING (user_id = auth.uid());