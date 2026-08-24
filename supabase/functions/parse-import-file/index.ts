const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveModel } from "../_shared/model.ts";

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Max upload size accepted by this function (raised so large quiz documents work)
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Base64-encode an ArrayBuffer in chunks.
 * Spreading a whole Uint8Array into String.fromCharCode overflows the JS call
 * stack ("Maximum call stack size exceeded") on files larger than ~100KB.
 */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32KB per chunk keeps the argument list small
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[]);
  }
  return btoa(binary);
}

const QUESTION_SYSTEM_PROMPT = `You are a quiz parser for an educational assessment app. Extract every assessment question from the provided document.

Return ONLY a valid JSON array. Each question object must have:
- "question_text": string (the full question stem, plain text or simple HTML)
- "question_type": one of "multiple_choice_question", "true_false_question", "multiple_answers_question", "short_answer_question", "essay_question", "matching_question", "numerical_question"
- "points_possible": number (default 1)
- "answers": array of { "text": string, "weight": number } — weight 100 for correct answers, 0 for incorrect. Empty array for essay/short answer questions when no key is given.
- "dok_level": number 1-4 (your best estimate of Depth of Knowledge)
- "blooms_level": one of "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"

Rules:
- Preserve the original wording of questions and options; do not invent new questions.
- Keep math/science notation as KaTeX ($...$) or HTML <sup>/<sub>.
- If a correct answer is not indicated, still list the options with weight 0.
- Return every question you find, in document order.`;

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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read file content as text for supported types
    const fileName = file.name.toLowerCase();
    let textContent = '';

    if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv')) {
      textContent = await file.text();
    } else {
      // For binary files (.docx, .xlsx, .pptx, .pdf), read as base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      
      // Use AI to extract and structure the content
      const mimeType = file.type || 'application/octet-stream';
      
      const aiResponse = await fetch(AI_GATEWAY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: resolveModel(null, "utility"),
          messages: [
            {
              role: 'system',
              content: `You are a document parser for an educational lesson planning app. Extract structured lesson plan content from the uploaded document. Return a JSON array of lesson objects. Each lesson should have:
- "title": string (lesson title)
- "objectives": string (learning objectives, separated by newlines)
- "activities": string (lesson activities description)
- "materials": string (materials needed)
- "assessment": string (assessment/evaluation methods)
- "notes": string (any additional notes or content)
- "duration_minutes": number | null (estimated duration)

If the document contains a single topic/reading rather than multiple lessons, create one lesson from it. Extract as much useful content as possible. Always return valid JSON array.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'file',
                  file: {
                    filename: file.name,
                    file_data: `data:${mimeType};base64,${base64}`,
                  }
                },
                {
                  type: 'text',
                  text: `Parse this document and extract lesson plan content. Return ONLY a valid JSON array.`
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 8000,
        }),
      });

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        console.error('AI Gateway error:', aiResponse.status, errBody);
        return new Response(JSON.stringify({ error: 'Failed to parse document with AI' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return new Response(JSON.stringify({ lessons: JSON.parse(jsonMatch[0]), source: file.name }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Could not extract structured content from document' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For text files, use AI to structure the content
    const aiResponse = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolveModel(null, "utility"),
        messages: [
          {
            role: 'system',
            content: `You are a document parser for an educational lesson planning app. Extract structured lesson plan content from the text. Return a JSON array of lesson objects with: "title", "objectives", "activities", "materials", "assessment", "notes", "duration_minutes". Always return valid JSON array.`
          },
          {
            role: 'user',
            content: `Parse this text document and extract lesson plan content. Return ONLY a valid JSON array.\n\nContent:\n${textContent.slice(0, 30000)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to parse text with AI' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return new Response(JSON.stringify({ lessons: JSON.parse(jsonMatch[0]), source: file.name }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Could not extract structured content' }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Parse import error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
