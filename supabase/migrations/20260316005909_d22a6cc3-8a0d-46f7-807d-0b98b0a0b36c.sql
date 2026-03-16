
-- Create library_books table
CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  page_count integer DEFAULT 0,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own books" ON public.library_books
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own books" ON public.library_books
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own books" ON public.library_books
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own books" ON public.library_books
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('library-pdfs', 'library-pdfs', true, 52428800, ARRAY['application/pdf']);

-- Storage RLS policies
CREATE POLICY "Users can upload own PDFs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'library-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'library-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own PDFs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'library-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can read library PDFs" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'library-pdfs');
