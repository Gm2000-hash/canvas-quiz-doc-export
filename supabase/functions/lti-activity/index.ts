import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Public endpoint to fetch an H5P activity by ID for LTI/embed playback.
 * Validates the LTI session if provided, otherwise serves the activity publicly.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const activityId = url.searchParams.get('id');
    const ltiSessionId = url.searchParams.get('lti_session');

    if (!activityId) {
      return new Response(JSON.stringify({ error: 'Activity ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch the activity using service role (bypasses RLS)
    const { data: activity, error } = await supabase
      .from('h5p_activities')
      .select('id, title, activity_type, content')
      .eq('id', activityId)
      .single();

    if (error || !activity) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If LTI session provided, validate it
    let ltiInfo = null;
    if (ltiSessionId) {
      const { data: session } = await supabase
        .from('lti_sessions')
        .select('id, canvas_user_name, activity_id, expires_at')
        .eq('id', ltiSessionId)
        .single();

      if (session && new Date(session.expires_at) > new Date()) {
        ltiInfo = {
          sessionId: session.id,
          studentName: session.canvas_user_name,
        };

        // Update session with correct activity_id if it was 'pending'
        if (session.activity_id === 'pending' || session.activity_id !== activityId) {
          await supabase
            .from('lti_sessions')
            .update({ activity_id: activityId })
            .eq('id', ltiSessionId);
        }
      }
    }

    return new Response(JSON.stringify({ activity, ltiInfo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
