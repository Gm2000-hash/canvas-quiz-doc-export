
-- Units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  discipline TEXT DEFAULT '',
  date_start DATE,
  date_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own units" ON public.units FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own units" ON public.units FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own units" ON public.units FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own units" ON public.units FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lesson plans table
CREATE TABLE public.lesson_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_date DATE,
  duration_minutes INTEGER DEFAULT 50,
  objectives TEXT DEFAULT '',
  activities JSONB DEFAULT '[]'::jsonb,
  materials TEXT DEFAULT '',
  assessment TEXT DEFAULT '',
  differentiation TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson plans" ON public.lesson_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lesson plans" ON public.lesson_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lesson plans" ON public.lesson_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lesson plans" ON public.lesson_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lesson plan standards junction table
CREATE TABLE public.lesson_plan_standards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  ngss_code TEXT NOT NULL,
  ngss_description TEXT NOT NULL
);

ALTER TABLE public.lesson_plan_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson standards" ON public.lesson_plan_standards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_plans WHERE lesson_plans.id = lesson_plan_standards.lesson_plan_id AND lesson_plans.user_id = auth.uid()));
CREATE POLICY "Users can insert own lesson standards" ON public.lesson_plan_standards FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lesson_plans WHERE lesson_plans.id = lesson_plan_standards.lesson_plan_id AND lesson_plans.user_id = auth.uid()));
CREATE POLICY "Users can update own lesson standards" ON public.lesson_plan_standards FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_plans WHERE lesson_plans.id = lesson_plan_standards.lesson_plan_id AND lesson_plans.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lesson_plans WHERE lesson_plans.id = lesson_plan_standards.lesson_plan_id AND lesson_plans.user_id = auth.uid()));
CREATE POLICY "Users can delete own lesson standards" ON public.lesson_plan_standards FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_plans WHERE lesson_plans.id = lesson_plan_standards.lesson_plan_id AND lesson_plans.user_id = auth.uid()));
