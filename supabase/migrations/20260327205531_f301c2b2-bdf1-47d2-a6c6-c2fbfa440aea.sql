
CREATE TABLE public.isat_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  grade_level text NOT NULL DEFAULT '6th',
  question_count integer NOT NULL DEFAULT 30,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb DEFAULT NULL,
  score numeric DEFAULT NULL,
  total_points numeric DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.isat_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exams" ON public.isat_exams
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own exams" ON public.isat_exams
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own exams" ON public.isat_exams
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own exams" ON public.isat_exams
  FOR DELETE TO authenticated USING (user_id = auth.uid());
