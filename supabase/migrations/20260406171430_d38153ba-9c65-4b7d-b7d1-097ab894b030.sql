
-- Review materials table
CREATE TABLE public.exam_review_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.isat_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  study_guide JSONB NOT NULL DEFAULT '[]'::jsonb,
  flashcards JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_lesson JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id)
);

ALTER TABLE public.exam_review_materials ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "Users can view own review materials" ON public.exam_review_materials
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own review materials" ON public.exam_review_materials
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own review materials" ON public.exam_review_materials
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own review materials" ON public.exam_review_materials
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Public access RPC for students
CREATE OR REPLACE FUNCTION public.get_public_review(_exam_id uuid)
RETURNS TABLE(
  id uuid,
  exam_id uuid,
  exam_title text,
  study_guide jsonb,
  flashcards jsonb,
  review_lesson jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT r.id, r.exam_id, e.title as exam_title, r.study_guide, r.flashcards, r.review_lesson
  FROM public.exam_review_materials r
  JOIN public.isat_exams e ON e.id = r.exam_id
  WHERE r.exam_id = _exam_id;
$$;
