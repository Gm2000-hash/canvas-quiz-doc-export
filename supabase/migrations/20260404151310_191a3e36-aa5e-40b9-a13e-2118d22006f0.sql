
-- Remove the overly permissive anon SELECT policy
DROP POLICY IF EXISTS "Public can view exams by id" ON public.isat_exams;

-- Create a security definer function that returns only safe exam fields
CREATE OR REPLACE FUNCTION public.get_public_exam(_exam_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  grade_level text,
  question_count integer,
  questions jsonb,
  hints_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.title,
    e.grade_level,
    e.question_count,
    e.questions,
    e.hints_enabled
  FROM public.isat_exams e
  WHERE e.id = _exam_id;
$$;
