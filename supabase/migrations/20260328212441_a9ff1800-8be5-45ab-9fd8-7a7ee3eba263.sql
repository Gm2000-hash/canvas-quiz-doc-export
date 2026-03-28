
-- Create a secure RPC function to look up a book by share token
CREATE OR REPLACE FUNCTION public.get_shared_book(_share_token text)
RETURNS TABLE (
  id uuid,
  title text,
  file_path text,
  source_discipline text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lb.id, lb.title, lb.file_path, lb.source_discipline
  FROM public.library_books lb
  WHERE lb.share_token = _share_token
    AND lb.is_published = true
  LIMIT 1;
$$;

-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Anyone can view books by share token" ON public.library_books;
