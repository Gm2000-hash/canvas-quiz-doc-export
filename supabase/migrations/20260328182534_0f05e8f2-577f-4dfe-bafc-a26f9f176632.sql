
CREATE TABLE public.custom_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  question_ids UUID[] NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quizzes" ON public.custom_quizzes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own quizzes" ON public.custom_quizzes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own quizzes" ON public.custom_quizzes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own quizzes" ON public.custom_quizzes FOR DELETE TO authenticated USING (user_id = auth.uid());
