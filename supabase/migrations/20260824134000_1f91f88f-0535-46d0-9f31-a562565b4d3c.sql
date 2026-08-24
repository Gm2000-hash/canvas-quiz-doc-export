-- Allow anonymous reads of library PDFs only for books that have an active share token
CREATE POLICY "Anon can read shared library PDFs"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'library-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.library_books lb
    WHERE lb.file_path = storage.objects.name
      AND lb.share_token IS NOT NULL
  )
);

-- Restore authenticated reads scoped to owners, admins, and published books
CREATE POLICY "Authenticated can read own or published library PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'library-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.library_books lb
      WHERE lb.file_path = storage.objects.name
        AND (lb.user_id = auth.uid() OR lb.is_published = true)
    )
  )
);