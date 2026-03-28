INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true);

CREATE POLICY "Users can upload book covers" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "Public read access for book covers" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'book-covers');

CREATE POLICY "Users can manage their covers" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'book-covers');