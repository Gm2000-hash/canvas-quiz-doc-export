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

    const { standard_code, standard_description, count = 10 } = await req.json();
    if (!standard_code || !standard_description) {
      throw new Error('standard_code and standard_description are required');
    }

    console.log(`Generating ${count} questions for ${standard_code}`);

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
            content: `You are an expert 8th-grade science assessment writer specializing in NGSS-aligned questions modeled after the Idaho Standards Achievement Test (ISAT). Generate high-quality, rigorous questions that assess the given performance expectation.

Create a MIX of these question types (distribute roughly evenly):
1. "multiple_choice_question" - 4 options, one correct. Include plausible distractors based on common misconceptions.
2. "multiple_answers_question" - 4-5 options, 2-3 correct. Students must select ALL correct answers.
3. "multi_step_question" - Multi-part (Part A, Part B, optionally Part C) where later parts build on earlier reasoning. Each part can be multiple_choice or short_answer.
4. "drag_and_drop_question" - 2-3 categories with 4-8 items total that students sort into the correct category.

Guidelines:
- Questions should be grade-appropriate (middle school, grades 6-8)
- Use real-world scenarios and phenomena when possible
- Include a range of DOK levels (1-3)
- Vary Bloom's taxonomy levels (Remember, Understand, Apply, Analyze, Evaluate)
- Make distractors plausible and based on common student misconceptions
- For multi-step, Part B should require reasoning about Part A's answer
- For drag-and-drop, categories should be clearly distinct

Use the tool provided to return your questions.`
          },
          {
            role: 'user',
            content: `Generate ${count} ISAT-style science questions for this NGSS standard:\n\nStandard: ${standard_code}\nDescription: ${standard_description}\n\nCreate a diverse mix of question types with varying difficulty levels.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_questions',
              description: 'Return generated ISAT-style questions',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_type: {
                          type: 'string',
                          enum: ['multiple_choice_question', 'multiple_answers_question', 'multi_step_question', 'drag_and_drop_question']
                        },
                        question_text: { type: 'string', description: 'The main question stem or scenario' },
                        points_possible: { type: 'number' },
                        dok_level: { type: 'number', enum: [1, 2, 3, 4] },
                        blooms_level: { type: 'string', enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] },
                        answers: {
                          type: 'object',
                          description: 'Answer data. For MC: array of {text, weight} where weight=100 for correct. For multi-answer: same but multiple weight=100. For multi-step: {parts: [{label, prompt, type, options: [{text, correct}]}]}. For drag-drop: {categories: [{label, items: [string]}]}.',
                        }
                      },
                      required: ['question_type', 'question_text', 'points_possible', 'dok_level', 'blooms_level', 'answers'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['questions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'return_questions' } }
      }),
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

    const parsed = JSON.parse(toolCall.function.arguments);

    // Normalize answer formats
    const questions = (parsed.questions || []).map((q: any) => {
      // For MC and multi-answer, ensure answers is an array
      if ((q.question_type === 'multiple_choice_question' || q.question_type === 'multiple_answers_question') && Array.isArray(q.answers)) {
        return q; // already correct format
      }
      // If answers came as {options: [...]} unwrap it
      if (q.answers?.options && Array.isArray(q.answers.options)) {
        if (q.question_type === 'multiple_choice_question' || q.question_type === 'multiple_answers_question') {
          return { ...q, answers: q.answers.options.map((o: any) => ({ text: o.text, weight: o.correct ? 100 : 0 })) };
        }
      }
      return q;
    });

    console.log(`Generated ${questions.length} questions for ${standard_code}`);

    return new Response(JSON.stringify({ questions, standard_code }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('generate-questions error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
