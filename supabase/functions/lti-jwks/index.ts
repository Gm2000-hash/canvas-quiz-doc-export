import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LTI 1.3 JWKS endpoint — serves the tool's public RSA key so Canvas can verify JWTs we sign.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKeyB64 = Deno.env.get('LTI_RSA_PUBLIC_KEY');
    if (!publicKeyB64) {
      throw new Error('LTI_RSA_PUBLIC_KEY not configured');
    }

    const publicKeyPem = new TextDecoder().decode(
      Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0))
    );

    // Parse PEM to extract the raw key data
    const pemBody = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    // Import as CryptoKey to extract JWK
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['verify']
    );

    const jwk = await crypto.subtle.exportKey('jwk', cryptoKey);

    const jwks = {
      keys: [
        {
          kty: jwk.kty,
          n: jwk.n,
          e: jwk.e,
          alg: 'RS256',
          use: 'sig',
          kid: 'lti-tool-key-1',
        },
      ],
    };

    return new Response(JSON.stringify(jwks), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
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
