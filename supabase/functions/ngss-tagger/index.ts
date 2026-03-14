import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const body = await req.text();
    console.log('Request body length:', body.length);
    
    const { questions } = JSON.parse(body);
    if (!questions || !Array.isArray(questions)) {
      throw new Error('questions array is required');
    }

    console.log('Processing', questions.length, 'questions');

    const questionList = questions.map((q: any) =>
      `Question ${q.id}: "${q.question_text}"`
    ).join('\n');

    const requestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an expert in Next Generation Science Standards (NGSS), particularly Middle School standards. Given quiz questions, identify the most relevant NGSS standard(s) for each question.

IMPORTANT GUIDELINES:
- Prioritize Middle School (MS-) standards when they fit the content level.
- For Earth and Space Science questions, look specifically for MS-ESS standards (MS-ESS1, MS-ESS2, MS-ESS3).
- For Life Science questions, use MS-LS standards. For Physical Science, use MS-PS standards.
- Only use High School (HS-) standards if the content clearly exceeds middle school level.
- Return the standard code (e.g., MS-ESS2-1, MS-LS2-4, MS-PS1-2) and a brief description.
- If a question doesn't align with any NGSS standard, return an empty array for that question.

Use the tool provided to return your analysis.`
        },
        {
          role: 'user',
          content: `Tag these quiz questions with NGSS standards:\n\n${questionList}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'tag_ngss_standards',
            description: 'Tag quiz questions with matching NGSS standards',
            parameters: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question_id: { type: 'number', description: 'The question ID' },
                      standards: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', description: 'NGSS standard code like HS-PS1-1' },
                            description: { type: 'string', description: 'Brief description of the standard' }
                          },
                          required: ['code', 'description'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['question_id', 'standards'],
                    additionalProperties: false
                  }
                }
              },
              required: ['tags'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'tag_ngss_standards' } }
    };

    console.log('Calling AI gateway...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('AI gateway status:', response.status, 'response length:', responseText.length);

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
      console.error('AI gateway error body:', responseText.substring(0, 500));
      throw new Error(`AI gateway error [${response.status}]`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText.substring(0, 500));
      throw new Error('Invalid JSON response from AI gateway');
    }

    console.log('AI response choices:', JSON.stringify(result.choices?.[0]?.message).substring(0, 300));

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: try to extract from content if no tool call
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        console.log('No tool call, got content instead:', content.substring(0, 200));
      }
      throw new Error('No tool call response from AI');
    }

    const args = toolCall.function?.arguments;
    if (!args) {
      console.error('Tool call has no arguments:', JSON.stringify(toolCall).substring(0, 300));
      throw new Error('Empty tool call arguments');
    }

    let parsed;
    try {
      parsed = JSON.parse(args);
    } catch (e) {
      console.error('Failed to parse tool args:', args.substring(0, 500));
      throw new Error('Invalid JSON in tool call arguments');
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('ngss-tagger error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
