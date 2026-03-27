
ALTER TABLE public.library_books 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT NULL;

-- Policy to allow anonymous read access when share_token matches
CREATE POLICY "Anyone can view books by share token"
ON public.library_books
FOR SELECT
TO anon
USING (share_token IS NOT NULL);
