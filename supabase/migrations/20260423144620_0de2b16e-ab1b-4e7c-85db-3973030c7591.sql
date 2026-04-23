CREATE OR REPLACE FUNCTION public.get_public_exam(_exam_id uuid)
 RETURNS TABLE(id uuid, title text, grade_level text, question_count integer, questions jsonb, hints_enabled boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          'points_possible', CASE WHEN jsonb_typeof(q->'points_possible') IN ('number', 'string') THEN (q->>'points_possible')::numeric ELSE NULL END,
          'dok_level', CASE WHEN jsonb_typeof(q->'dok_level') IN ('number', 'string') THEN (q->>'dok_level')::integer ELSE NULL END,
          'blooms_level', q->>'blooms_level',
          'hint', q->>'hint',
          'image_url', q->>'image_url',
          'media', CASE
            WHEN jsonb_typeof(q->'media') = 'object' THEN
              jsonb_build_object(
                'url', q->'media'->>'url',
                'type', q->'media'->>'type',
                'activity_id', q->'media'->>'activity_id',
                'activity_type', q->'media'->>'activity_type'
              )
            ELSE q->'media'
          END,
          'answers', CASE
            WHEN jsonb_typeof(q->'answers') = 'array' THEN (
              SELECT jsonb_agg(a - 'weight' - 'correct')
              FROM jsonb_array_elements(q->'answers') a
            )
            WHEN jsonb_typeof(q->'answers') = 'object' THEN q->'answers'
            ELSE q->'answers'
          END
        )
      )
      FROM jsonb_array_elements(e.questions) q
    ),
    e.hints_enabled
  FROM public.isat_exams e
  WHERE e.id = _exam_id;
END;
$function$;