
CREATE TABLE public.curriculum_lesson_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
  ngss_code text NOT NULL,
  ngss_description text NOT NULL,
  matched_terms text[] NOT NULL DEFAULT '{}'::text[]
);

ALTER TABLE public.curriculum_lesson_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own curriculum lesson standards" ON public.curriculum_lesson_standards
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.curriculum_lessons WHERE curriculum_lessons.id = curriculum_lesson_standards.lesson_id AND curriculum_lessons.user_id = auth.uid()));

CREATE POLICY "Users can insert own curriculum lesson standards" ON public.curriculum_lesson_standards
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.curriculum_lessons WHERE curriculum_lessons.id = curriculum_lesson_standards.lesson_id AND curriculum_lessons.user_id = auth.uid()));

CREATE POLICY "Users can delete own curriculum lesson standards" ON public.curriculum_lesson_standards
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.curriculum_lessons WHERE curriculum_lessons.id = curriculum_lesson_standards.lesson_id AND curriculum_lessons.user_id = auth.uid()));

CREATE POLICY "Users can update own curriculum lesson standards" ON public.curriculum_lesson_standards
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.curriculum_lessons WHERE curriculum_lessons.id = curriculum_lesson_standards.lesson_id AND curriculum_lessons.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.curriculum_lessons WHERE curriculum_lessons.id = curriculum_lesson_standards.lesson_id AND curriculum_lessons.user_id = auth.uid()));
