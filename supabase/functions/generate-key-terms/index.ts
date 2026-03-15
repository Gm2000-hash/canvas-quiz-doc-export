import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { standards } = await req.json();
    if (!standards || !Array.isArray(standards) || standards.length === 0) {
      throw new Error('standards array is required');
    }

    // Process in batches of 30 to stay within context limits
    const BATCH_SIZE = 30;
    const allResults: { code: string; key_terms: string[] }[] = [];

    for (let i = 0; i < standards.length; i += BATCH_SIZE) {
      const batch = standards.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} standards`);

      const standardsList = batch
        .map((s: any) => `- ${s.code}: ${s.description}`)
        .join('\n');

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: `You are a curriculum expert. For each academic standard, generate 5-10 specific key terms or short phrases that a quiz question aligned to that standard would likely contain. Focus on:
- Content-specific vocabulary (e.g., "mitosis", "alliteration", "ratio")
- Concepts and processes unique to that standard
- Terms that distinguish this standard from similar ones
- Practical classroom terminology students would encounter

Return ONLY terms that are highly specific to the standard's content. Avoid generic academic terms like "analyze", "explain", "understand".`
            },
            {
              role: 'user',
              content: `Generate key terms for these standards:\n\n${standardsList}`
            }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'save_key_terms',
                description: 'Save generated key terms for each standard',
                parameters: {
                  type: 'object',
                  properties: {
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          code: { type: 'string', description: 'The standard code' },
                          key_terms: {
                            type: 'array',
                            items: { type: 'string' },
                            description: '5-10 specific key terms for this standard'
                          }
                        },
                        required: ['code', 'key_terms'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['results'],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: 'function', function: { name: 'save_key_terms' } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in workspace settings.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const errText = await response.text();
        console.error('AI gateway error:', response.status, errText.substring(0, 500));
        throw new Error(`AI gateway error [${response.status}]`);
      }

      const result = JSON.parse(await response.text());
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error('No tool call response from AI');

      const parsed = JSON.parse(toolCall.function?.arguments);
      if (parsed.results) {
        allResults.push(...parsed.results);
      }
    }

    console.log(`Generated key terms for ${allResults.length} standards`);
    return new Response(JSON.stringify({ results: allResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('generate-key-terms error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
