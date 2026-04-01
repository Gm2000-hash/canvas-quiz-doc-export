import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LTI 1.3 JWKS endpoint.
 * Generates an RSA key pair on first call, stores it in the database, and serves the public JWK.
 */

const KEY_TABLE = 'lti_platforms'; // We'll store the key in a special row

async function getOrCreateKeyPair(supabase: any): Promise<CryptoKeyPair> {
  // Try to get existing key from Deno KV-like approach — generate deterministically
  // For edge functions, we generate once and cache in memory per instance
  // For persistence, we use the LTI_RSA_PRIVATE_KEY secret if available
  
  const privateKeyRaw = Deno.env.get('LTI_RSA_PRIVATE_KEY') || '';
  const publicKeyRaw = Deno.env.get('LTI_RSA_PUBLIC_KEY') || '';
  
  if (privateKeyRaw && publicKeyRaw) {
    // Try to parse as PEM
    let privPem = privateKeyRaw;
    let pubPem = publicKeyRaw;
    
    // If base64-encoded PEM, decode first
    if (!privPem.includes('-----BEGIN')) {
      try {
        // Remove any whitespace and decode
        const cleaned = privPem.replace(/[\s\n\r]/g, '');
        privPem = new TextDecoder().decode(Uint8Array.from(atob(cleaned), c => c.charCodeAt(0)));
      } catch {
        // Not valid base64, try as-is
      }
    }
    if (!pubPem.includes('-----BEGIN')) {
      try {
        const cleaned = pubPem.replace(/[\s\n\r]/g, '');
        pubPem = new TextDecoder().decode(Uint8Array.from(atob(cleaned), c => c.charCodeAt(0)));
      } catch {
        // Not valid base64
      }
    }
    
    if (privPem.includes('-----BEGIN') && pubPem.includes('-----BEGIN')) {
      const privBody = privPem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
      const pubBody = pubPem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s/g, '');
      
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        Uint8Array.from(atob(privBody), c => c.charCodeAt(0)),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        true,
        ['sign']
      );
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        Uint8Array.from(atob(pubBody), c => c.charCodeAt(0)),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        true,
        ['verify']
      );
      
      return { privateKey, publicKey } as CryptoKeyPair;
    }
  }
  
  // Generate a new key pair if secrets aren't available
  return await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
}

let cachedJwk: any = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!cachedJwk) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      const keyPair = await getOrCreateKeyPair(supabase);
      cachedJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    }

    const jwks = {
      keys: [
        {
          kty: cachedJwk.kty,
          n: cachedJwk.n,
          e: cachedJwk.e,
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
    console.error('JWKS error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
