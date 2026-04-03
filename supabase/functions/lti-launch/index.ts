import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LTI 1.3 Launch Handler
 * Canvas POSTs the id_token here after OIDC login. We validate the JWT,
 * extract the user info and AGS claims, update the session, and redirect to the activity.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form post from Canvas
    const formData = await req.formData();
    const idToken = formData.get('id_token')?.toString();
    const state = formData.get('state')?.toString();

    if (!idToken) {
      return new Response('Missing id_token', { status: 400, headers: corsHeaders });
    }

    // Decode JWT header and payload (without full verification first to get issuer/kid)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return new Response('Invalid JWT format', { status: 400, headers: corsHeaders });
    }

    const headerJson = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payloadJson = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    const issuer = payloadJson.iss;
    const clientId = payloadJson.aud;
    const nonce = payloadJson.nonce;

    // Look up platform
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: platforms } = await supabase
      .from('lti_platforms')
      .select('*')
      .eq('issuer', issuer)
      .eq('client_id', Array.isArray(clientId) ? clientId[0] : clientId)
      .limit(1);

    if (!platforms || platforms.length === 0) {
      return new Response(`Unknown platform: ${issuer}`, { status: 403, headers: corsHeaders });
    }

    const platform = platforms[0];

    // Fetch Canvas's public keys to verify the JWT
    const jwksResp = await fetch(platform.jwks_url);
    const jwks = await jwksResp.json();

    const kid = headerJson.kid;
    const matchingKey = jwks.keys.find((k: any) => k.kid === kid) || jwks.keys[0];

    if (!matchingKey) {
      return new Response('No matching key in platform JWKS', { status: 403, headers: corsHeaders });
    }

    // Import the platform's public key
    const platformKey = await crypto.subtle.importKey(
      'jwk',
      matchingKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify signature
    const signatureBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      platformKey,
      signatureBytes,
      signedContent
    );

    if (!valid) {
      return new Response('Invalid JWT signature', { status: 403, headers: corsHeaders });
    }

    // Validate claims
    const now = Math.floor(Date.now() / 1000);
    if (payloadJson.exp && payloadJson.exp < now) {
      return new Response('Token expired', { status: 403, headers: corsHeaders });
    }

    // Extract LTI claims
    const ltiMessageType = payloadJson['https://purl.imsglobal.org/spec/lti/claim/message_type'];
    const ltiVersion = payloadJson['https://purl.imsglobal.org/spec/lti/claim/version'];
    const resourceLink = payloadJson['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    const agsClaim = payloadJson['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'];
    const customClaims = payloadJson['https://purl.imsglobal.org/spec/lti/claim/custom'] || {};
    const targetLinkUri = payloadJson['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] || '';

    // Extract user info
    const canvasUserId = payloadJson.sub;
    const canvasUserName = payloadJson.name || payloadJson.given_name || 'Student';

    // Determine activity ID from custom claims or target_link_uri
    let activityId = customClaims.activity_id || '';
    let isatExamId = '';
    if (!activityId && targetLinkUri) {
      // Try to extract ISAT exam ID from URL like /isat-exam/{id}
      const isatMatch = targetLinkUri.match(/\/isat-exam\/([^/?#]+)/);
      if (isatMatch) {
        isatExamId = isatMatch[1];
      } else {
        // Try to extract activity ID from URL like /activities/{id}/play
        const match = targetLinkUri.match(/\/activities\/([^/]+)/);
        if (match) activityId = match[1];
      }
    }

    // Extract lineitem URL for grade passback
    let lineitemUrl = '';
    if (agsClaim) {
      lineitemUrl = agsClaim.lineitem || '';
      // If no specific lineitem, use lineitems container
      if (!lineitemUrl && agsClaim.lineitems) {
        lineitemUrl = agsClaim.lineitems;
      }
    }

    // Find and update the pending session by nonce
    const { data: sessions } = await supabase
      .from('lti_sessions')
      .select('*')
      .eq('nonce', nonce)
      .eq('canvas_user_id', 'pending')
      .limit(1);

    let sessionId: string;

    if (sessions && sessions.length > 0) {
      sessionId = sessions[0].id;
      await supabase
        .from('lti_sessions')
        .update({
          canvas_user_id: canvasUserId,
          canvas_user_name: canvasUserName,
          activity_id: activityId,
          lineitem_url: lineitemUrl,
          access_token_url: platform.auth_token_url,
          client_id: platform.client_id,
        })
        .eq('id', sessionId);
    } else {
      // Create new session
      const { data: newSession } = await supabase
        .from('lti_sessions')
        .insert({
          platform_id: platform.id,
          canvas_user_id: canvasUserId,
          canvas_user_name: canvasUserName,
          activity_id: activityId,
          lineitem_url: lineitemUrl,
          access_token_url: platform.auth_token_url,
          client_id: platform.client_id,
          nonce: nonce,
        })
        .select('id')
        .single();

      sessionId = newSession?.id ?? crypto.randomUUID();
    }

    // Redirect to the activity with the LTI session ID
    const appUrl = Deno.env.get('LTI_APP_URL') || 'https://canvas-quiz-doc-export.lovable.app';
    let activityUrl: string;
    if (isatExamId) {
      activityUrl = `${appUrl}/isat-exam/${isatExamId}?lti_session=${sessionId}`;
    } else if (activityId) {
      activityUrl = `${appUrl}/activities/${activityId}/play?lti_session=${sessionId}`;
    } else {
      activityUrl = `${appUrl}/stress-navigator?lti_session=${sessionId}`;
    }

    return new Response(null, {
      status: 302,
      headers: {
        'Location': activityUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('LTI Launch error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
