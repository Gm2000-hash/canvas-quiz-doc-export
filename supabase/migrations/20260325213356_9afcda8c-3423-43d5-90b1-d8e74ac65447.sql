
-- Curriculum lessons table for rich content (objectives, readings, key terms, quizzes, interactive activities)
CREATE TABLE public.curriculum_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  intro JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
  reading_title TEXT,
  reading_paragraphs JSONB DEFAULT '[]'::jsonb,
  reading_questions JSONB DEFAULT '[]'::jsonb,
  interactive_activities JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own curriculum lessons"
  ON public.curriculum_lessons FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own curriculum lessons"
  ON public.curriculum_lessons FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own curriculum lessons"
  ON public.curriculum_lessons FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own curriculum lessons"
  ON public.curriculum_lessons FOR DELETE TO authenticated
  USING (user_id = auth.uid());
