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

serve(withLogging("generate-questions", async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log('Authenticated generate-questions request from', userId);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return new Response(JSON.stringify({ error: "Request body is empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsedBody;
    try { parsedBody = JSON.parse(rawBody); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { standard_code, standard_description, count = 10, subject, framework = "NGSS", dok_level, question_style } = parsedBody;
    if (!standard_code || !standard_description) {
      throw new Error('standard_code and standard_description are required');
    }

    console.log(`Generating ${count} questions for ${standard_code} (${framework}, style: ${question_style || 'standard'})`);

    // Adapt system prompt based on framework/subject
    const isIdaho = framework === "Idaho";
    const subjectContext = isIdaho
      ? subject === "Math"
        ? "mathematics"
        : subject === "Social Studies"
        ? "social studies (world geography and history)"
        : "English Language Arts (reading comprehension, writing, vocabulary, grammar)"
      : "science";

    const gradeRange = "middle school, grades 6-8";
    const testName = isIdaho ? "Idaho Standards Achievement Test (ISAT)" : "Idaho Standards Achievement Test (ISAT)";
    const frameworkLabel = isIdaho ? `Idaho Content Standard` : `NGSS standard`;

    // For ELA, use different question types
    const elaQuestionTypes = `
1. "multiple_choice_question" - 4 options, one correct. Include plausible distractors.
2. "multiple_answers_question" - 4-5 options, 2-3 correct. Students must select ALL correct answers.
3. "multi_step_question" - Multi-part (Part A, Part B) where later parts build on earlier reasoning.
4. "drag_and_drop_question" - 2-3 categories with 4-8 items total that students sort.`;

    // Big Ideas Math style question types
    const bigIdeasMathTypes = `
1. "multiple_choice_question" - 4 options, one correct. Questions should follow Big Ideas Math curriculum style:
   - Start with a clear worked example or model, then ask students to apply the same method to a new problem
   - Include "Tell whether..." or "Determine whether..." classification questions
   - Feature real-world application problems with specific numerical contexts
   - Use scaffolded difficulty within the standard
2. "multiple_answers_question" - 4-5 options, 2-3 correct. "Select ALL that apply" style:
   - Ask students to identify all correct examples, properties, or representations
   - Include problems like "Which of the following are equivalent to..." or "Which expressions represent..."
3. "multi_step_question" - Multi-part following Big Ideas "Explore & Grow" pattern:
   - Part A: Set up or identify the concept (e.g., "What equation represents this situation?")
   - Part B: Solve or apply (e.g., "Solve the equation")
   - Part C (optional): Explain reasoning or interpret the result in context
4. "drag_and_drop_question" - Sorting/matching activities:
   - Sort expressions, equations, or values into categories (e.g., "Linear vs. Nonlinear", "Rational vs. Irrational")
   - Match representations (graph → equation → table)`;

    // Desmos-style question types
    const desmosMathTypes = `
1. "multiple_choice_question" - 4 options, one correct. Questions should follow Desmos/activity-builder style:
   - Present a visual scenario, graph description, or interactive-style prompt
   - Ask "Which graph represents...", "What happens to the graph when...", or "Which statement best describes..."
   - Focus on graphical reasoning, pattern recognition, and conceptual understanding over computation
   - Include questions about transformations, function behavior, and data interpretation
2. "multiple_answers_question" - 4-5 options, 2-3 correct. Desmos "Check all" style:
   - "Select ALL statements that are true about this function/graph/pattern"
   - Ask students to identify multiple correct representations or properties
   - Focus on connecting different representations (verbal, graphical, algebraic, tabular)
3. "multi_step_question" - Multi-part following Desmos "Screen by Screen" exploration:
   - Part A: Make a prediction or observation (e.g., "Describe the pattern you notice")
   - Part B: Apply mathematical reasoning (e.g., "Write a rule that fits the pattern")
   - Part C (optional): Extend or generalize (e.g., "What would happen if...")
4. "drag_and_drop_question" - Interactive matching/sorting:
   - Match graphs to equations, tables to rules, or descriptions to representations
   - Sort values, expressions, or scenarios into categories based on properties
   - Sequence steps in a mathematical process or proof`;

    const standardMathTypes = `
1. "multiple_choice_question" - 4 options, one correct. Include common computational errors as distractors.
2. "multiple_answers_question" - 4-5 options, 2-3 correct. Students must select ALL correct answers.
3. "multi_step_question" - Multi-part (Part A, Part B, optionally Part C) where later parts build on earlier reasoning. Include showing work or explaining reasoning.
4. "drag_and_drop_question" - 2-3 categories with 4-8 items total that students sort or order.`;

    const scienceQuestionTypes = `
1. "multiple_choice_question" - 4 options, one correct. Include plausible distractors based on common misconceptions.
2. "multiple_answers_question" - 4-5 options, 2-3 correct. Students must select ALL correct answers.
3. "multi_step_question" - Multi-part (Part A, Part B, optionally Part C) where later parts build on earlier reasoning.
4. "drag_and_drop_question" - 2-3 categories with 4-8 items total that students sort into the correct category.`;

    let questionTypes: string;
    if (subject === "ELA") {
      questionTypes = elaQuestionTypes;
    } else if (subject === "Math") {
      if (question_style === "big_ideas") questionTypes = bigIdeasMathTypes;
      else if (question_style === "desmos") questionTypes = desmosMathTypes;
      else questionTypes = standardMathTypes;
    } else {
      questionTypes = scienceQuestionTypes;
    }

    // Style-specific guidelines
    const bigIdeasGuidelines = `- Follow Big Ideas Math curriculum design philosophy: conceptual understanding → procedural fluency → application
- Use "Explore & Grow" discovery-style questioning that guides students to understand the concept
- Include vocabulary-check questions (e.g., "What is the slope of the line?", "Name the property illustrated")
- Feature "Real-Life Application" problems with realistic contexts (sports, cooking, construction, finance)
- Include "Error Analysis" questions where students identify and correct common mistakes
- Use precise mathematical language consistent with Big Ideas Math textbooks`;

    const desmosGuidelines = `- Follow Desmos Activity Builder design philosophy: visual, interactive, and exploratory
- Emphasize graphical and visual reasoning over pure computation
- Include "Notice and Wonder" style prompts that encourage observation before formal analysis
- Feature "Card Sort" style categorization and matching activities
- Ask students to describe patterns in their own words before formalizing with equations
- Focus on multiple representations: graphs, tables, equations, and verbal descriptions
- Include questions that build mathematical intuition through estimation and prediction
- Use accessible, conversational language that invites exploration`;

    const subjectGuidelines = subject === "Math"
      ? question_style === "big_ideas"
        ? bigIdeasGuidelines
        : question_style === "desmos"
        ? desmosGuidelines
        : `- Include real-world mathematical scenarios and word problems
- Use accurate mathematical notation
- Vary computational complexity
- Include problems that require conceptual understanding, not just procedures`
      : subject === "ELA"
      ? `- Use grade-appropriate reading passages or excerpts when relevant
- Include questions about textual evidence, vocabulary in context, and writing skills
- Focus on critical thinking about texts and language`
      : subject === "Social Studies"
      ? `- Use primary sources, maps, timelines, or historical scenarios when relevant
- Include questions about cause/effect, comparing perspectives, and analyzing evidence
- Reference real historical events, civilizations, or geographic concepts`
      : `- Use real-world scenarios and phenomena when possible
- Make distractors plausible and based on common student misconceptions
- For multi-step, Part B should require reasoning about Part A's answer`;

    const msStandardsList = `
ALLOWED Middle School NGSS Standards (use ONLY these):

8th Grade Earth & Space Science:
MS-ESS1-1, MS-ESS1-2, MS-ESS1-3, MS-ESS1-4
MS-ESS2-1, MS-ESS2-2, MS-ESS2-3, MS-ESS2-4, MS-ESS2-5, MS-ESS2-6
MS-ESS3-1, MS-ESS3-2, MS-ESS3-3

7th Grade Life Science:
MS-LS1-1, MS-LS1-2, MS-LS1-3, MS-LS1-4, MS-LS1-5, MS-LS1-6, MS-LS1-7, MS-LS1-8
MS-LS2-1, MS-LS2-2, MS-LS2-3, MS-LS2-4, MS-LS2-5
MS-LS3-1, MS-LS3-2
MS-LS4-1, MS-LS4-2, MS-LS4-3, MS-LS4-4, MS-LS4-5, MS-LS4-6

6th Grade Physical Science:
MS-PS1-1, MS-PS1-2, MS-PS1-3, MS-PS1-4, MS-PS1-5, MS-PS1-6
MS-PS2-1, MS-PS2-2, MS-PS2-3, MS-PS2-4, MS-PS2-5
MS-PS3-1, MS-PS3-2, MS-PS3-3, MS-PS3-4, MS-PS3-5
MS-PS4-1, MS-PS4-2, MS-PS4-3`;

    const formattingInstructions = subject === "Math"
      ? `\n\nFORMATTING: Use LaTeX notation for ALL mathematical expressions in both question text and answer options:
- Exponents: $x^2$, $3^4$, $10^{-3}$
- Fractions: $\\frac{1}{2}$, $\\frac{x+1}{x-1}$
- Square roots: $\\sqrt{16}$, $\\sqrt{x^2 + y^2}$
- Multiplication: $3 \\times 5$, NOT 3*5
- Variables and expressions: $2x + 3 = 7$, NOT 2x + 3 = 7
- Subscripts: $a_1$, $x_n$
- Greek letters: $\\pi$, $\\theta$
- Inequalities: $x \\geq 5$, $y < 3$
Never use plain text for math expressions like x^2 or 1/2. Always wrap in $ delimiters.`
      : subject === "ELA" || subject === "Social Studies"
      ? ``
      : `\n\nFORMATTING: Use proper notation for scientific expressions:
- Chemical formulas: use HTML subscripts like H<sub>2</sub>O, CO<sub>2</sub>, NaCl
- Scientific notation: use LaTeX like $3 \\times 10^5$ or $6.02 \\times 10^{23}$
- Exponents in science: use LaTeX like $m/s^2$, $kg \\cdot m^2$
- Units with exponents: $cm^3$, $m^2$
Never write plain text like 10^5 or H2O. Use proper formatting.`;

    const systemPrompt = `You are an expert ${gradeRange} ${subjectContext} assessment writer specializing in ${testName}-aligned questions. Generate high-quality, rigorous questions that assess the given standard.

${framework === "NGSS" ? `IMPORTANT: Only generate questions for valid Middle School NGSS standards. Do NOT reference any High School (HS-) standards.\n${msStandardsList}\n` : ''}
Create a MIX of these question types (distribute roughly evenly):
${questionTypes}

Guidelines:
- Questions should be grade-appropriate (${gradeRange})
${subjectGuidelines}
${dok_level
  ? `- Generate ALL questions at DOK Level ${dok_level}${dok_level === 1 ? ' (Recall & Reproduction — factual recall, definitions, simple identification)' : dok_level === 2 ? ' (Skills & Concepts — requires reasoning, comparing, explaining, interpreting data)' : dok_level === 3 ? ' (Strategic Thinking — requires analysis, evidence-based arguments, multi-step reasoning, justification)' : ' (Extended Thinking — requires investigation, complex reasoning, synthesis across concepts)'}
- Match Bloom's taxonomy levels appropriate for DOK ${dok_level}`
  : `- Include a range of DOK levels (1-3)
- Vary Bloom's taxonomy levels (Remember, Understand, Apply, Analyze, Evaluate)`}
- For drag-and-drop, categories should be clearly distinct
${formattingInstructions}

Use the tool provided to return your questions.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate ${count} ${testName}-style ${subjectContext} questions for this ${frameworkLabel}:\n\nStandard: ${standard_code}\nDescription: ${standard_description}\n\nCreate a diverse mix of question types with varying difficulty levels.`
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
                          description: 'One of: multiple_choice_question, multiple_answers_question, multi_step_question, drag_and_drop_question'
                        },
                        question_text: { type: 'string', description: 'The main question stem or scenario' },
                        points_possible: { type: 'number', description: 'Point value, typically 1-3' },
                        dok_level: { type: 'number', description: 'DOK level 1-4' },
                        blooms_level: { type: 'string', description: 'One of: Remember, Understand, Apply, Analyze, Evaluate, Create' },
                        answers_json: {
                          type: 'string',
                          description: 'JSON string of answer data. For MC/multi-answer: [{"text":"...","weight":100},{"text":"...","weight":0}]. For multi-step: {"parts":[{"label":"Part A","prompt":"...","type":"multiple_choice","options":[{"text":"...","correct":true}]}]}. For drag-drop: {"categories":[{"label":"...","items":["item1","item2"]}]}.',
                        }
                      },
                      required: ['question_type', 'question_text', 'points_possible', 'dok_level', 'blooms_level', 'answers_json']
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

    const questions = (parsed.questions || []).map((q: any) => {
      let answers = q.answers;
      if (q.answers_json) {
        try {
          answers = JSON.parse(q.answers_json);
        } catch (e) {
          console.error('Failed to parse answers_json:', q.answers_json?.substring?.(0, 200));
          answers = [];
        }
      }

      if ((q.question_type === 'multiple_choice_question' || q.question_type === 'multiple_answers_question') && Array.isArray(answers)) {
        answers = answers.map((a: any) => ({ text: a.text, weight: a.weight ?? (a.correct ? 100 : 0) }));
      }
      if (answers?.options && Array.isArray(answers.options)) {
        if (q.question_type === 'multiple_choice_question' || q.question_type === 'multiple_answers_question') {
          answers = answers.options.map((o: any) => ({ text: o.text, weight: o.correct ? 100 : 0 }));
        }
      }

      const { answers_json, ...rest } = q;
      return { ...rest, answers };
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
}));
