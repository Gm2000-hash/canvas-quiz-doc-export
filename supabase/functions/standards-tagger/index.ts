import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Unified standards tagger – handles both NGSS (Science) and Idaho (ELA, Math, Social Studies).
 * Accepts { questions, framework, subject?, grade?, keyTermsMap?, standardsList? }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const body = await req.json();
    const { questions, framework, subject, grade, keyTermsMap, standardsList } = body;

    if (!questions || !Array.isArray(questions)) {
      throw new Error('questions array is required');
    }
    if (!framework || !['ngss', 'idaho'].includes(framework)) {
      throw new Error('framework must be "ngss" or "idaho"');
    }

    console.log(`Tagging ${questions.length} questions with ${framework} (${subject || 'all'} ${grade || 'all'})`);

    const questionList = questions.map((q: any) =>
      `Question ${q.id}: "${q.question_text}"`
    ).join('\n');

    // Build key terms section
    let keyTermsSection = '';
    if (keyTermsMap && typeof keyTermsMap === 'object') {
      const entries = Object.entries(keyTermsMap as Record<string, string[]>)
        .filter(([, terms]) => Array.isArray(terms) && terms.length > 0)
        .map(([code, terms]) => `  ${code}: ${(terms as string[]).join(', ')}`)
        .join('\n');
      if (entries) {
        keyTermsSection = `\n\nKEY TERMS FOR MATCHING — Use these topic-specific keywords to help identify the correct standard for each question. If a question mentions several of these terms, it is very likely aligned to that standard:\n${entries}\n`;
      }
    }

    // Build standards list for prompt
    let standardsListText = '';
    if (standardsList && Array.isArray(standardsList)) {
      standardsListText = standardsList.map((s: any) => `- ${s.code}: ${s.description}`).join('\n');
    }

    const systemPrompt = framework === 'ngss'
      ? buildNGSSPrompt(keyTermsSection)
      : buildIdahoPrompt(subject || 'ELA', grade || '6-8', standardsListText, keyTermsSection);

    const requestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Tag these quiz questions with standards:\n\n${questionList}` }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'tag_standards',
            description: 'Tag quiz questions with matching standards',
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
                            code: { type: 'string', description: 'Standard code' },
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
      tool_choice: { type: 'function', function: { name: 'tag_standards' } }
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('AI gateway status:', response.status);

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
      console.error('AI gateway error:', responseText.substring(0, 500));
      throw new Error(`AI gateway error [${response.status}]`);
    }

    const result = JSON.parse(responseText);
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call response from AI');

    const parsed = JSON.parse(toolCall.function?.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('standards-tagger error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildNGSSPrompt(keyTermsSection: string): string {
  return `You are an expert in Next Generation Science Standards (NGSS) for Middle School. Given quiz questions, identify the most relevant NGSS standard(s) for each question.

You may ONLY use standards from this exact list:

8th Grade Earth & Space Science:
- MS-ESS1-1: Develop and use a model of the Earth-sun-moon system to describe the cyclic patterns of lunar phases, eclipses of the sun and moon, and seasons
- MS-ESS1-2: Develop and use a model to describe the role of gravity in the motions within galaxies and the solar system
- MS-ESS1-3: Analyze and interpret data to determine scale properties of objects in the solar system
- MS-ESS1-4: Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth's history
- MS-ESS2-1: Develop a model to describe the cycling of Earth's materials and the flow of energy that drives this process
- MS-ESS2-2: Construct an explanation based on evidence for how geoscience processes have changed Earth's surface
- MS-ESS2-3: Analyze and interpret data on the distribution of fossils and rocks, continental shapes, and seafloor structures to provide evidence of past plate motions
- MS-ESS2-4: Develop a model to describe the cycling of water through Earth's systems
- MS-ESS2-5: Collect data to provide evidence for how the motions and complex interactions of air masses result in changes in weather conditions
- MS-ESS2-6: Develop and use a model to describe how unequal heating and rotation of the Earth cause patterns of atmospheric and oceanic circulation
- MS-ESS3-1: Construct a scientific explanation for how the uneven distributions of Earth's mineral, energy, and groundwater resources are the result of past and current geoscience processes
- MS-ESS3-2: Analyze and interpret data on natural hazards to forecast future catastrophic events
- MS-ESS3-3: Apply scientific principles to design a method for monitoring and minimizing a human impact on the environment

7th Grade Life Science:
- MS-LS1-1 through MS-LS4-6 (all Middle School Life Science standards)

6th Grade Physical Science:
- MS-PS1-1 through MS-PS4-3 (all Middle School Physical Science standards)
${keyTermsSection}
RULES:
- ONLY use standards from the MS- prefix list. Do NOT use any HS- (high school) standards.
- Use the KEY TERMS section above as strong hints for matching.
- Content-specific vocabulary matters more than the formal standard description.
- Return the standard code and a brief description.
- If a question doesn't align with any standard, return an empty array for that question.

Use the tool provided to return your analysis.`;
}

function buildIdahoPrompt(subject: string, grade: string, standardsList: string, keyTermsSection: string): string {
  return `You are an expert in Idaho State Standards for ${subject} (Grade ${grade}). Given quiz questions, identify the most relevant Idaho standard(s) for each question.

You may ONLY use standards from this exact list:

${standardsList}
${keyTermsSection}
RULES:
- ONLY use standards from the list above. Do NOT invent standard codes.
- Use the KEY TERMS section above as strong hints for matching.
- Content-specific vocabulary matters more than the formal standard description.
- Return the standard code and a brief description.
- If a question doesn't align with any standard from the list, return an empty array for that question.
- Prefer the most specific standard that matches the question content.

Use the tool provided to return your analysis.`;
}
