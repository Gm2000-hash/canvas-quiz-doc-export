
-- Drop existing per-user policies on library_books
DROP POLICY IF EXISTS "Users can view own books" ON public.library_books;
DROP POLICY IF EXISTS "Users can insert own books" ON public.library_books;
DROP POLICY IF EXISTS "Users can update own books" ON public.library_books;
DROP POLICY IF EXISTS "Users can delete own books" ON public.library_books;

-- All authenticated users can read all books (shared library)
CREATE POLICY "All users can view books" ON public.library_books
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert books" ON public.library_books
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update books" ON public.library_books
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete books" ON public.library_books
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update storage policies: let all authenticated users read, only admins upload/delete
DROP POLICY IF EXISTS "Users can upload own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own PDFs" ON storage.objects;

CREATE POLICY "All users can view library PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'library-pdfs');

CREATE POLICY "Admins can upload library PDFs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'library-pdfs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete library PDFs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'library-pdfs' AND public.has_role(auth.uid(), 'admin'));
