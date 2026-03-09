
-- Question bank table
CREATE TABLE public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  canvas_question_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  points_possible NUMERIC DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  source_course TEXT,
  source_quiz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NGSS tags for question bank items
CREATE TABLE public.question_bank_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_bank_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE NOT NULL,
  ngss_code TEXT NOT NULL,
  ngss_description TEXT NOT NULL
);

-- RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_standards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own questions
CREATE POLICY "Users can view own questions" ON public.question_bank FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own questions" ON public.question_bank FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own questions" ON public.question_bank FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Standards follow parent question access
CREATE POLICY "Users can view own standards" ON public.question_bank_standards FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.question_bank WHERE id = question_bank_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own standards" ON public.question_bank_standards FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.question_bank WHERE id = question_bank_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own standards" ON public.question_bank_standards FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.question_bank WHERE id = question_bank_id AND user_id = auth.uid())
);

-- Index for fast lookups
CREATE INDEX idx_question_bank_user ON public.question_bank(user_id);
CREATE INDEX idx_question_bank_standards_qid ON public.question_bank_standards(question_bank_id);
