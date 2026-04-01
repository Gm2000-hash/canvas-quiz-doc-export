import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * LTI 1.3 Score Posting (Assignment and Grade Services)
 * Called by the frontend when a student completes an activity.
 * Uses OAuth 2.0 Client Credentials to get an access token from Canvas,
 * then posts the score to the lineitem.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId, score, maxScore, activityId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from('lti_sessions')
      .select('*, lti_platforms(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'LTI session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'LTI session has expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record the completion
    await supabase.from('activity_completions').insert({
      session_id: sessionId,
      activity_id: activityId || session.activity_id,
      score: score ?? 0,
      max_score: maxScore ?? 100,
    });

    // If no lineitem URL, we can't post grades back
    if (!session.lineitem_url) {
      await supabase
        .from('lti_sessions')
        .update({ score_posted: false })
        .eq('id', sessionId);

      return new Response(JSON.stringify({
        success: true,
        gradePosted: false,
        message: 'Score recorded but no grade passback URL available',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get platform info
    const platform = session.lti_platforms;
    if (!platform) {
      return new Response(JSON.stringify({ error: 'Platform configuration not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Get an OAuth 2.0 access token using client credentials + JWT assertion
    const privateKeyB64 = Deno.env.get('LTI_RSA_PRIVATE_KEY');
    if (!privateKeyB64) {
      return new Response(JSON.stringify({ error: 'LTI_RSA_PRIVATE_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const privateKeyPem = new TextDecoder().decode(
      Uint8Array.from(atob(privateKeyB64), c => c.charCodeAt(0))
    );

    // Parse PEM to import as CryptoKey
    const pemBody = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Build the JWT for client assertion
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: 'RS256', typ: 'JWT', kid: 'lti-tool-key-1' };
    const jwtPayload = {
      iss: session.client_id,
      sub: session.client_id,
      aud: session.access_token_url,
      iat: now,
      exp: now + 300,
      jti: crypto.randomUUID(),
    };

    const encodePart = (obj: any) => {
      const json = JSON.stringify(obj);
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const headerEncoded = encodePart(jwtHeader);
    const payloadEncoded = encodePart(jwtPayload);
    const signingInput = `${headerEncoded}.${payloadEncoded}`;

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signingInput)
    );

    const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const clientAssertion = `${signingInput}.${signatureEncoded}`;

    // Request access token
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
    });

    const tokenResp = await fetch(session.access_token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenResp.ok) {
      const tokenErr = await tokenResp.text();
      console.error('Token request failed:', tokenResp.status, tokenErr);
      return new Response(JSON.stringify({
        success: true,
        gradePosted: false,
        message: `Score recorded but token request failed: ${tokenResp.status}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    // Step 2: Post the score to Canvas via AGS
    const scoreUrl = session.lineitem_url.replace(/\/$/, '') + '/scores';

    const scorePayload = {
      userId: session.canvas_user_id,
      scoreGiven: score ?? 0,
      scoreMaximum: maxScore ?? 100,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      timestamp: new Date().toISOString(),
    };

    const scoreResp = await fetch(scoreUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
      },
      body: JSON.stringify(scorePayload),
    });

    if (!scoreResp.ok) {
      const scoreErr = await scoreResp.text();
      console.error('Score post failed:', scoreResp.status, scoreErr);
      return new Response(JSON.stringify({
        success: true,
        gradePosted: false,
        message: `Score recorded but grade passback failed: ${scoreResp.status}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark session as score posted
    await supabase
      .from('lti_sessions')
      .update({ score_posted: true })
      .eq('id', sessionId);

    return new Response(JSON.stringify({
      success: true,
      gradePosted: true,
      message: 'Score posted to Canvas successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('LTI Score error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
