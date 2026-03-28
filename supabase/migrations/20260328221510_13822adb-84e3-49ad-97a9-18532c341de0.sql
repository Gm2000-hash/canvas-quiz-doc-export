-- Fix 1: Allow book owners to view their own books (published or not)
CREATE POLICY "Users can view own books"
  ON public.library_books FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix 2: Create a security definer function to safely get published books without share_token
CREATE OR REPLACE FUNCTION public.get_published_books()
RETURNS TABLE (
  id uuid,
  title text,
  file_path text,
  file_size bigint,
  source_discipline text,
  cover_url text,
  is_published boolean,
  page_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, file_path, file_size, source_discipline, cover_url, is_published, page_count, created_at, updated_at
  FROM library_books
  WHERE is_published = true;
$$;