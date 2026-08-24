-- 1. Lock down SECURITY DEFINER functions that must not be callable by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_published_books() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- has_role stays executable by authenticated because RLS policies evaluate it as the caller
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_published_books() TO service_role;

-- 2. library-pdfs: remove anonymous read access (private bucket)
DROP POLICY IF EXISTS "Public can read library PDFs" ON storage.objects;
DROP POLICY IF EXISTS "All users can view library PDFs" ON storage.objects;

-- 3. book-covers: scope writes to the uploader's own folder
DROP POLICY IF EXISTS "Users can upload book covers" ON storage.objects;
CREATE POLICY "Users can upload own book covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can manage their covers" ON storage.objects;
CREATE POLICY "Users can delete own book covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'book-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own book covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'book-covers' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'book-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. activity-media: scope inserts to the uploader's own folder
DROP POLICY IF EXISTS "Authenticated users can upload activity media" ON storage.objects;
CREATE POLICY "Users can upload own activity media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activity-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own activity media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'activity-media' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'activity-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Prevent anonymous listing of public buckets (reads by direct path still work)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Authenticated can list avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public read access for book covers" ON storage.objects;
CREATE POLICY "Authenticated can list book covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "Public read access for activity media" ON storage.objects;
CREATE POLICY "Authenticated can list activity media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'activity-media');

-- 6. lti_platforms: ensure INSERT is explicitly owner-scoped
DROP POLICY IF EXISTS "Users can manage own LTI platforms" ON public.lti_platforms;
CREATE POLICY "Users can view own LTI platforms" ON public.lti_platforms
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own LTI platforms" ON public.lti_platforms
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own LTI platforms" ON public.lti_platforms
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own LTI platforms" ON public.lti_platforms
FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON TABLE public.lti_platforms FROM anon;