import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

function extractGoogleId(url: string): { id: string; type: 'doc' | 'sheet' | 'slide' } | null {
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { id: docMatch[1], type: 'doc' };

  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return { id: sheetMatch[1], type: 'sheet' };

  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) return { id: slideMatch[1], type: 'slide' };

  return null;
}

function getExportUrl(id: string, type: 'doc' | 'sheet' | 'slide'): string {
  switch (type) {
    case 'doc':
      return `https://docs.google.com/document/d/${id}/export?format=txt`;
    case 'sheet':
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    case 'slide':
      return `https://docs.google.com/presentation/d/${id}/export?format=txt`;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = extractGoogleId(url.trim());
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Not a valid Google Docs, Sheets, or Slides URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the exported text/csv content
    const exportUrl = getExportUrl(parsed.id, parsed.type);
    const fetchRes = await fetch(exportUrl, { redirect: 'follow' });

    if (!fetchRes.ok) {
      const status = fetchRes.status;
      if (status === 401 || status === 403) {
        return new Response(JSON.stringify({ error: 'This document is not publicly shared. Please set sharing to "Anyone with the link".' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Failed to fetch document (status ${status})` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textContent = await fetchRes.text();

    if (!textContent || textContent.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Document appears to be empty' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to structure the content into lessons
    const docTypeLabel = parsed.type === 'doc' ? 'Google Doc' : parsed.type === 'sheet' ? 'Google Sheet (CSV)' : 'Google Slides';

    const aiResponse = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a document parser for an educational lesson planning app. Extract structured lesson plan content from the provided ${docTypeLabel}. Return a JSON array of lesson objects. Each lesson should have:
- "title": string (lesson title)
- "objectives": string (learning objectives, separated by newlines)
- "activities": string (lesson activities description)
- "materials": string (materials needed)
- "assessment": string (assessment/evaluation methods)
- "notes": string (any additional notes or content)
- "duration_minutes": number | null (estimated duration)

If the document contains a single topic rather than multiple lessons, create one lesson from it. Extract as much useful content as possible. Always return valid JSON array.`
          },
          {
            role: 'user',
            content: `Parse this ${docTypeLabel} content and extract lesson plan content. Return ONLY a valid JSON array.\n\nContent:\n${textContent.slice(0, 30000)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to parse document with AI' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      return new Response(JSON.stringify({
        lessons: JSON.parse(jsonMatch[0]),
        source: `${docTypeLabel}`,
        docType: parsed.type,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Could not extract structured content from document' }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Google import error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
