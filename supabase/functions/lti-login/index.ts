import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LTI 1.3 OIDC Login Initiation
 * Canvas POSTs here to start the launch flow. We redirect back to Canvas's auth endpoint.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data or JSON
    let params: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => { params[key] = value.toString(); });
    } else if (contentType.includes('application/json')) {
      params = await req.json();
    } else {
      // Try URL params (GET request)
      const url = new URL(req.url);
      url.searchParams.forEach((value, key) => { params[key] = value; });
    }

    const { iss, login_hint, target_link_uri, lti_message_hint, client_id } = params;

    if (!iss || !login_hint) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: iss, login_hint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the platform registration
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let query = supabase
      .from('lti_platforms')
      .select('*')
      .eq('issuer', iss);

    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    const { data: platforms, error } = await query.limit(1);

    if (error || !platforms || platforms.length === 0) {
      return new Response(JSON.stringify({ error: `No registered platform found for issuer: ${iss}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const platform = platforms[0];

    // Generate state and nonce
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    // Build the redirect URL for Canvas's authorization endpoint
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const redirectUri = `${supabaseUrl}/functions/v1/lti-launch`;

    const authParams = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      client_id: platform.client_id,
      redirect_uri: redirectUri,
      login_hint: login_hint,
      state: state,
      response_mode: 'form_post',
      nonce: nonce,
      prompt: 'none',
    });

    if (lti_message_hint) {
      authParams.set('lti_message_hint', lti_message_hint);
    }

    // Store state/nonce temporarily in lti_sessions for validation
    await supabase.from('lti_sessions').insert({
      platform_id: platform.id,
      canvas_user_id: 'pending',
      activity_id: 'pending',
      nonce: nonce,
      client_id: platform.client_id,
      access_token_url: platform.auth_token_url,
    });

    const redirectUrl = `${platform.auth_login_url}?${authParams.toString()}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
