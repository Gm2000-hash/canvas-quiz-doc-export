-- Add publish state for shared library books
ALTER TABLE public.library_books
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Keep existing books visible after rollout
UPDATE public.library_books
SET is_published = true
WHERE is_published IS NOT TRUE;

-- New uploads start unpublished until an admin publishes them
ALTER TABLE public.library_books
ALTER COLUMN is_published SET DEFAULT false;

-- Tighten library book visibility
DROP POLICY IF EXISTS "All users can view books" ON public.library_books;

CREATE POLICY "Users can view published books"
ON public.library_books
FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Admins can view all books"
ON public.library_books
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Make the PDF bucket private so unpublished files are not directly accessible
UPDATE storage.buckets
SET public = false
WHERE id = 'library-pdfs';

-- Replace storage policies for the library bucket with secure access rules
DROP POLICY IF EXISTS "Authenticated users can view published library pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage library pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload library pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update library pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete library pdfs" ON storage.objects;

CREATE POLICY "Authenticated users can view published library pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'library-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.library_books lb
      WHERE lb.file_path = name
        AND lb.is_published = true
    )
  )
);

CREATE POLICY "Admins can upload library pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'library-pdfs'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update library pdfs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'library-pdfs'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'library-pdfs'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete library pdfs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'library-pdfs'
  AND public.has_role(auth.uid(), 'admin')
);