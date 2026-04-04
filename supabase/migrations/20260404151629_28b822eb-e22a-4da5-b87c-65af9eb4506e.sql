
CREATE OR REPLACE FUNCTION public.get_public_exam(_exam_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  grade_level text,
  question_count integer,
  questions jsonb,
  hints_enabled boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.grade_level,
    e.question_count,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'question_number', q->>'question_number',
          'question_type', q->>'question_type',
          'question_text', q->>'question_text',
          'standard_code', q->>'standard_code',
          'standard_description', q->>'standard_description',
          'points_possible', (q->>'points_possible')::numeric,
          'dok_level', (q->>'dok_level')::integer,
          'blooms_level', q->>'blooms_level',
          'hint', q->>'hint',
          'answers', (
            SELECT jsonb_agg(
              a - 'weight' - 'correct'
            )
            FROM jsonb_array_elements(q->'answers') a
          )
        )
      )
      FROM jsonb_array_elements(e.questions) q
    ),
    e.hints_enabled
  FROM public.isat_exams e
  WHERE e.id = _exam_id;
END;
$$;
