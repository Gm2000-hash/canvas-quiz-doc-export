import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";
import { resolveModel } from "../_shared/model.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function requireAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      userId: null,
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims?.sub) {
    return {
      userId: null,
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return { userId: data.claims.sub as string, error: null };
}

serve(withLogging("ngss-tagger", async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log('Authenticated ngss-tagger request from', userId);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const body = await req.text();
    console.log('Request body length:', body.length);
    
    const parsedBody = JSON.parse(body);
    const { questions, keyTermsMap } = parsedBody;
    if (!questions || !Array.isArray(questions)) {
      throw new Error('questions array is required');
    }

    console.log('Processing', questions.length, 'questions');

    const questionList = questions.map((q: any) =>
      `Question ${q.id}: "${q.question_text}"`
    ).join('\n');

    // Build key terms section for the prompt
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

    const requestBody = {
      model: resolveModel(parsedBody, "utility"),
      messages: [
        {
          role: 'system',
          content: `You are an expert in Next Generation Science Standards (NGSS) for Middle School. Given quiz questions, identify the most relevant NGSS standard(s) for each question.

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
- MS-LS1-1: Conduct an investigation to provide evidence that living things are made of cells
- MS-LS1-2: Develop and use a model to describe the function of a cell as a whole and ways the parts of cells contribute to the function
- MS-LS1-3: Use argument supported by evidence for how the body is a system of interacting subsystems
- MS-LS1-4: Use argument based on empirical evidence and scientific reasoning to support an explanation for how characteristic animal behaviors and specialized plant structures affect the probability of successful reproduction
- MS-LS1-5: Construct a scientific explanation based on evidence for how environmental and genetic factors influence the growth of organisms
- MS-LS1-6: Construct a scientific explanation based on evidence for the role of photosynthesis in the cycling of matter and flow of energy
- MS-LS1-7: Develop a model to describe how food is rearranged through chemical reactions forming new molecules that support growth and/or release energy
- MS-LS1-8: Gather and synthesize information that sensory receptors respond to stimuli by sending messages to the brain
- MS-LS2-1: Analyze and interpret data to provide evidence for the effects of resource availability on organisms and populations
- MS-LS2-2: Construct an explanation that predicts patterns of interactions among organisms across multiple ecosystems
- MS-LS2-3: Develop a model to describe the cycling of matter and flow of energy among living and nonliving parts of an ecosystem
- MS-LS2-4: Construct an argument supported by empirical evidence that changes to physical or biological components of an ecosystem affect populations
- MS-LS2-5: Evaluate competing design solutions for maintaining biodiversity and ecosystem services
- MS-LS3-1: Develop and use a model to describe why structural changes to genes (mutations) may affect proteins
- MS-LS3-2: Develop and use a model to describe why asexual reproduction results in offspring with identical genetic information and sexual reproduction results in offspring with genetic variation
- MS-LS4-1: Analyze and interpret data for patterns in the fossil record
- MS-LS4-2: Apply scientific ideas to construct an explanation for the anatomical similarities and differences among organisms
- MS-LS4-3: Analyze displays of pictorial data to compare patterns of similarities in embryological development across multiple species
- MS-LS4-4: Construct an explanation based on evidence that describes how genetic variations of traits in a population increase some individuals' probability of surviving and reproducing
- MS-LS4-5: Gather and synthesize information about technologies that have changed the way humans influence the inheritance of desired traits
- MS-LS4-6: Use mathematical representations to support explanations of how natural selection may lead to increases and decreases of specific traits

6th Grade Physical Science:
- MS-PS1-1: Develop models to describe the atomic composition of simple molecules and extended structures
- MS-PS1-2: Analyze and interpret data on the properties of substances before and after the substances interact to determine if a chemical reaction has occurred
- MS-PS1-3: Gather and make sense of information to describe that synthetic materials come from natural resources and impact society
- MS-PS1-4: Develop a model that predicts and describes changes in particle motion, temperature, and state of a pure substance when thermal energy is added or removed
- MS-PS1-5: Develop and use a model to describe how the total number of atoms does not change in a chemical reaction and thus mass is conserved
- MS-PS1-6: Undertake a design project to construct, test, and modify a device that either releases or absorbs thermal energy by chemical processes
- MS-PS2-1: Apply Newton's Third Law to design a solution to a problem involving the motion of two colliding objects
- MS-PS2-2: Plan an investigation to provide evidence that the change in an object's motion depends on the sum of the forces acting on the object and the mass of the object
- MS-PS2-3: Ask questions about data to determine the factors that affect the strength of electric and magnetic forces
- MS-PS2-4: Construct and present arguments using evidence to support the claim that gravitational interactions are attractive and depend on the masses of interacting objects
- MS-PS2-5: Conduct an investigation and evaluate the experimental design to provide evidence that fields exist between objects exerting forces on each other
- MS-PS3-1: Construct and interpret graphical displays of data to describe the relationships of kinetic energy to the mass and speed of an object
- MS-PS3-2: Develop a model to describe that when the arrangement of objects interacting at a distance changes, different amounts of potential energy are stored
- MS-PS3-3: Apply scientific principles to design, construct, and test a device that either minimizes or maximizes thermal energy transfer
- MS-PS3-4: Plan an investigation to determine the relationships among the energy transferred, type of matter, mass, and change in average kinetic energy
- MS-PS3-5: Construct, use, and present arguments to support the claim that when the kinetic energy of an object changes, energy is transferred
- MS-PS4-1: Use mathematical representations to describe a simple model for waves
- MS-PS4-2: Develop and use a model to describe that waves are reflected, absorbed, or transmitted through various materials
- MS-PS4-3: Integrate qualitative scientific and technical information to support the claim that digitized signals are a more reliable way to encode and transmit information
${keyTermsSection}
RULES:
- ONLY use standards from the list above. Do NOT use any HS- (high school) standards.
- Use the KEY TERMS section above as strong hints. If a question mentions terms like "fossil", "geologic time scale", "era", "period", "epoch", etc., it very likely aligns with MS-ESS1-4 or MS-LS4-1.
- Content-specific vocabulary matters more than the formal standard description. A question about "stegosaurus" or "dinosaur" likely relates to MS-LS4-1 (fossil record) or MS-ESS1-4 (geologic time scale) depending on context.
- Return the standard code and a brief description.
- If a question doesn't align with any standard from the list, return an empty array for that question.

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
                            code: { type: 'string', description: 'NGSS standard code like MS-PS1-1' },
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
}));
