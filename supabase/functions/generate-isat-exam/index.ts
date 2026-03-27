import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      userId: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims?.sub) {
    return {
      userId: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { userId: data.claims.sub as string, error: null };
}

// Standards organized by grade level
const GRADE_STANDARDS: Record<string, { prefix: string; label: string; coreIdeas: string[] }> = {
  "6th": {
    prefix: "PS",
    label: "Physical Science",
    coreIdeas: ["MS-PS1", "MS-PS2", "MS-PS3", "MS-PS4"],
  },
  "7th": {
    prefix: "LS",
    label: "Life Science",
    coreIdeas: ["MS-LS1", "MS-LS2", "MS-LS3", "MS-LS4"],
  },
  "8th": {
    prefix: "ESS",
    label: "Earth & Space Science",
    coreIdeas: ["MS-ESS1", "MS-ESS2", "MS-ESS3"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log("Authenticated generate-isat-exam request from", userId);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { grade_level, question_count = 35, title } = await req.json();

    if (!grade_level || !GRADE_STANDARDS[grade_level]) {
      return new Response(
        JSON.stringify({ error: "Invalid grade_level. Must be 6th, 7th, or 8th." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const gradeConfig = GRADE_STANDARDS[grade_level];
    const clampedCount = Math.min(Math.max(question_count, 15), 60);

    console.log(`Generating ${clampedCount}-question ISAT exam for ${grade_level} grade (${gradeConfig.label})`);

    const systemPrompt = `You are an expert middle school science assessment writer creating a practice ISAT (Idaho Standards Achievement Test) End-of-Course Assessment (ECA).

You are creating a COMPLETE practice exam for ${grade_level} grade ${gradeConfig.label}. This exam must be realistic in difficulty, format, and question distribution.

The exam must cover ALL ${gradeConfig.label} NGSS standards (core ideas: ${gradeConfig.coreIdeas.join(", ")}) with questions distributed across them.

## QUESTION TYPES TO INCLUDE (distribute across the exam):

1. **Technology-Enhanced Items (TEI)** - Use question types: "multiple_choice_question", "multiple_answers_question", "drag_and_drop_question"
   - Multiple choice with scientifically plausible distractors
   - Select-all-that-apply with 2-3 correct options out of 4-5
   - Drag-and-drop sorting into categories

2. **Data Analysis & Interpretation** - Use type: "data_analysis_question"
   - Present a data table, graph description, or experimental results
   - Ask students to analyze trends, draw conclusions, or identify variables
   - Include the data directly in the question text

3. **Modeling & Diagramming** - Use type: "multi_step_question"
   - Questions about identifying components of systems (food webs, water cycle, molecular structures, etc.)
   - Multi-part: Part A identifies components, Part B explains relationships

4. **Scenario-Based / Simulation Tasks** - Use type: "scenario_question"  
   - Present a real-world scientific scenario (environmental investigation, lab experiment, etc.)
   - Ask students to apply scientific principles to solve the problem
   - Include relevant context/data in the question stem

5. **Constructed Response (Open-Ended)** - Use type: "constructed_response_question"
   - Students must write explanations, arguments, or justifications using evidence
   - Require citing specific data or scientific principles
   - Worth 2-3 points each

6. **Investigation Design** - Use type: "investigation_design_question"
   - Ask students to identify variables (independent, dependent, controlled)
   - Form hypotheses or choose correct experimental procedures
   - Can be multiple choice or constructed response format

7. **Concept Mapping** - Use type: "concept_map_question"
   - Link scientific concepts to show cause-and-effect relationships
   - Use drag-and-drop format with relationship labels
   - E.g., energy flow, ecosystem interactions, force relationships

## DISTRIBUTION RULES:
- Include ALL ${gradeConfig.coreIdeas.length} core ideas with roughly equal coverage
- Mix DOK levels: ~25% DOK 1, ~40% DOK 2, ~25% DOK 3, ~10% DOK 4
- Mix Bloom's levels appropriately
- At least 3 constructed response questions
- At least 2 investigation design questions
- At least 3 data analysis questions
- At least 3 scenario-based questions
- At least 2 concept mapping questions
- Remaining questions should be TEI (MC, select-all, drag-and-drop)
- Each question must specify which standard it assesses

## IMPORTANT:
- Questions should be challenging but fair for middle school students
- Use realistic scientific scenarios and data
- Distractors should reflect common student misconceptions
- Multi-step questions should build logically
- Constructed responses should have clear rubric criteria in the scoring_rubric field`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a complete ${clampedCount}-question ISAT practice exam for ${grade_level} grade ${gradeConfig.label}. 

Cover these core ideas: ${gradeConfig.coreIdeas.join(", ")}

Make this exam realistic and challenging — it should prepare students for the actual ISAT ECA. Include a variety of question types as specified.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_exam",
              description: "Return the complete ISAT practice exam",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_number: { type: "number", description: "Sequential question number" },
                        question_type: {
                          type: "string",
                          enum: [
                            "multiple_choice_question",
                            "multiple_answers_question",
                            "drag_and_drop_question",
                            "data_analysis_question",
                            "multi_step_question",
                            "scenario_question",
                            "constructed_response_question",
                            "investigation_design_question",
                            "concept_map_question",
                          ],
                        },
                        question_text: { type: "string", description: "The full question stem including any scenario, data, or context" },
                        standard_code: { type: "string", description: "The NGSS standard code (e.g., MS-PS1-2)" },
                        standard_description: { type: "string", description: "Brief description of the standard" },
                        points_possible: { type: "number", description: "Point value (1-3)" },
                        dok_level: { type: "number", description: "DOK level 1-4" },
                        blooms_level: { type: "string", enum: ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"] },
                        answers_json: {
                          type: "string",
                          description: `JSON string of answer data based on type:
- MC: [{"text":"...","weight":100},{"text":"...","weight":0}]
- Multiple answers: [{"text":"...","weight":100},{"text":"...","weight":0}] (multiple with weight 100)
- Drag-drop/concept map: {"categories":[{"label":"...","items":["item1","item2"]}]}
- Multi-step: {"parts":[{"label":"Part A","prompt":"...","type":"multiple_choice","options":[{"text":"...","correct":true}]},{"label":"Part B","prompt":"...","type":"short_answer","correctText":"..."}]}
- Data analysis/scenario: [{"text":"...","weight":100},{"text":"...","weight":0}] (treat as MC with rich stem)
- Constructed response: {"prompt":"...","scoring_rubric":"...","sample_response":"..."}
- Investigation design: [{"text":"...","weight":100},{"text":"...","weight":0}] or {"prompt":"...","scoring_rubric":"...","sample_response":"..."}`,
                        },
                      },
                      required: ["question_number", "question_type", "question_text", "standard_code", "points_possible", "dok_level", "blooms_level", "answers_json"],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_exam" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text.substring(0, 500));
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      // Retry: try parsing from message content
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.questions) {
            const questions = processQuestions(parsed.questions);
            return respondWithQuestions(questions, grade_level, clampedCount);
          }
        } catch { /* fall through */ }
      }
      throw new Error("No exam returned from AI");
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      // Try cleaning the JSON
      const cleaned = toolCall.function.arguments
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      parsed = JSON.parse(cleaned);
    }

    const questions = processQuestions(parsed.questions || []);
    console.log(`Generated ${questions.length}-question ISAT exam for ${grade_level} grade`);

    return respondWithQuestions(questions, grade_level, clampedCount);
  } catch (e) {
    console.error("generate-isat-exam error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function processQuestions(raw: any[]): any[] {
  return raw.map((q: any, idx: number) => {
    let answers = null;
    if (q.answers_json) {
      try {
        answers = typeof q.answers_json === "string" ? JSON.parse(q.answers_json) : q.answers_json;
      } catch {
        console.error(`Failed to parse answers_json for Q${idx + 1}`);
        answers = [];
      }
    }

    // Normalize MC/multi-answer arrays
    if (Array.isArray(answers)) {
      answers = answers.map((a: any, i: number) => ({
        id: i + 1,
        text: a.text || "",
        weight: a.weight ?? (a.correct ? 100 : 0),
      }));
    }

    return {
      question_number: q.question_number || idx + 1,
      question_type: q.question_type || "multiple_choice_question",
      question_text: q.question_text || "",
      standard_code: q.standard_code || "",
      standard_description: q.standard_description || "",
      points_possible: q.points_possible || 1,
      dok_level: q.dok_level || 2,
      blooms_level: q.blooms_level || "Understand",
      answers,
    };
  });
}

function respondWithQuestions(questions: any[], grade_level: string, requested: number) {
  return new Response(
    JSON.stringify({ questions, grade_level, question_count: questions.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
