
-- LTI 1.3 Platform Registrations (Canvas instances)
CREATE TABLE public.lti_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Canvas',
  issuer text NOT NULL,
  client_id text NOT NULL,
  auth_login_url text NOT NULL,
  auth_token_url text NOT NULL,
  jwks_url text NOT NULL,
  deployment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lti_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own LTI platforms"
  ON public.lti_platforms FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- LTI 1.3 Launch Sessions (tracks student launches)
CREATE TABLE public.lti_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES public.lti_platforms(id) ON DELETE CASCADE,
  canvas_user_id text NOT NULL,
  canvas_user_name text,
  activity_id text NOT NULL,
  lineitem_url text,
  access_token_url text,
  client_id text,
  nonce text,
  score_posted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '4 hours'
);

ALTER TABLE public.lti_sessions ENABLE ROW LEVEL SECURITY;

-- Sessions are managed by edge functions via service role, no direct user access needed
CREATE POLICY "Service role manages LTI sessions"
  ON public.lti_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Activity Completions (scores from LTI launches)
CREATE TABLE public.activity_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.lti_sessions(id) ON DELETE CASCADE,
  activity_id text NOT NULL,
  score numeric NOT NULL,
  max_score numeric NOT NULL DEFAULT 100,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages activity completions"
  ON public.activity_completions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
