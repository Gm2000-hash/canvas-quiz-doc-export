INSERT INTO storage.buckets (id, name, public) VALUES ('activity-media', 'activity-media', true);

CREATE POLICY "Authenticated users can upload activity media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activity-media');

CREATE POLICY "Public read access for activity media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'activity-media');

CREATE POLICY "Users can delete own activity media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'activity-media' AND (storage.foldername(name))[1] = auth.uid()::text);