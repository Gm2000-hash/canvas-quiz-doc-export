CREATE TABLE public.canvas_layouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  scope_key text NOT NULL,
  elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope_key)
);

ALTER TABLE public.canvas_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canvas layouts"
ON public.canvas_layouts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own canvas layouts"
ON public.canvas_layouts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own canvas layouts"
ON public.canvas_layouts FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own canvas layouts"
ON public.canvas_layouts FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_canvas_layouts_updated_at
BEFORE UPDATE ON public.canvas_layouts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();