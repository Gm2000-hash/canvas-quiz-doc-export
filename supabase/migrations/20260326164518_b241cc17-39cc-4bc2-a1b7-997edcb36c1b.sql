CREATE TABLE public.h5p_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.h5p_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON public.h5p_activities FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own activities" ON public.h5p_activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own activities" ON public.h5p_activities FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own activities" ON public.h5p_activities FOR DELETE TO authenticated USING (user_id = auth.uid());