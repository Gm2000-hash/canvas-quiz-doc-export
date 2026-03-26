CREATE TABLE public.h5p_activity_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.h5p_activities(id) ON DELETE CASCADE,
  ngss_code text NOT NULL,
  ngss_description text NOT NULL,
  matched_terms text[] NOT NULL DEFAULT '{}',
  UNIQUE (activity_id, ngss_code)
);

ALTER TABLE public.h5p_activity_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity standards"
ON public.h5p_activity_standards FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.h5p_activities
  WHERE h5p_activities.id = h5p_activity_standards.activity_id
  AND h5p_activities.user_id = auth.uid()
));

CREATE POLICY "Users can insert own activity standards"
ON public.h5p_activity_standards FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.h5p_activities
  WHERE h5p_activities.id = h5p_activity_standards.activity_id
  AND h5p_activities.user_id = auth.uid()
));

CREATE POLICY "Users can delete own activity standards"
ON public.h5p_activity_standards FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.h5p_activities
  WHERE h5p_activities.id = h5p_activity_standards.activity_id
  AND h5p_activities.user_id = auth.uid()
));

CREATE POLICY "Users can update own activity standards"
ON public.h5p_activity_standards FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.h5p_activities
  WHERE h5p_activities.id = h5p_activity_standards.activity_id
  AND h5p_activities.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.h5p_activities
  WHERE h5p_activities.id = h5p_activity_standards.activity_id
  AND h5p_activities.user_id = auth.uid()
));