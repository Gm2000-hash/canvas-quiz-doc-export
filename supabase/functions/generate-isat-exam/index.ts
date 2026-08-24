import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";
import { resolveModel } from "../_shared/model.ts";
import { withUdl } from "../_shared/udl.ts";
import { ExactQuestionCountError, QuestionGenerationError, generateExactQuestions } from "../_shared/exact-question-generation.ts";

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

// Legacy grade-level standards mapping (fallback)
const GRADE_STANDARDS: Record<string, { prefix: string; label: string; coreIdeas: string[] }> = {
  "6th": { prefix: "PS", label: "Physical Science", coreIdeas: ["MS-PS1", "MS-PS2", "MS-PS3", "MS-PS4"] },
  "7th": { prefix: "LS", label: "Life Science", coreIdeas: ["MS-LS1", "MS-LS2", "MS-LS3", "MS-LS4"] },
  "8th": { prefix: "ESS", label: "Earth & Space Science", coreIdeas: ["MS-ESS1", "MS-ESS2", "MS-ESS3"] },
};

serve(withLogging("generate-isat-exam", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log("Authenticated generate-isat-exam request from", userId);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const { grade_level, question_count = 35, selected_standards } = parsedBody;
    const requestedCount = Math.min(50, Math.max(1, Math.floor(Number(question_count) || 1)));

    // Build standards context from either selected_standards or legacy grade_level
    let standardsContext: string;
    let disciplineLabel: string;

    if (selected_standards && Array.isArray(selected_standards) && selected_standards.length > 0) {
      // New flow: specific standards selected
      const standardsList = selected_standards
        .map((s: any) => `- ${s.code}: ${s.description}`)
        .join("\n");

      // Determine which disciplines are covered
      const disciplines: string[] = [];
      if (selected_standards.some((s: any) => s.code.startsWith("MS-PS"))) disciplines.push("Physical Science");
      if (selected_standards.some((s: any) => s.code.startsWith("MS-LS"))) disciplines.push("Life Science");
      if (selected_standards.some((s: any) => s.code.startsWith("MS-ESS"))) disciplines.push("Earth & Space Science");
      disciplineLabel = disciplines.join(", ");

      standardsContext = `The exam must cover EXACTLY these ${selected_standards.length} NGSS standards:\n${standardsList}\n\nDistribute questions across all listed standards as evenly as possible.`;

      console.log(`Generating ${requestedCount}-question ISAT exam for ${selected_standards.length} specific standards (${disciplineLabel})`);
    } else if (grade_level && GRADE_STANDARDS[grade_level]) {
      // Legacy flow: grade level
      const gradeConfig = GRADE_STANDARDS[grade_level];
      disciplineLabel = gradeConfig.label;
      standardsContext = `The exam must cover ALL ${gradeConfig.label} NGSS standards (core ideas: ${gradeConfig.coreIdeas.join(", ")}) with questions distributed across them.`;

      console.log(`Generating ${requestedCount}-question ISAT exam for ${grade_level} grade (${gradeConfig.label})`);
    } else {
      return new Response(
        JSON.stringify({ error: "Must provide either selected_standards or a valid grade_level." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are an expert middle school science assessment writer creating a practice ISAT (Idaho Standards Achievement Test) End-of-Course Assessment (ECA).

You are creating a COMPLETE practice exam covering: ${disciplineLabel}.

${standardsContext}

## ⚠️ NON-NEGOTIABLE QUALITY RULES (failing any rule = invalid question)

1. **TEXT-ONLY EXAM — NO VISUALS EXIST.** This exam is delivered as plain text. NEVER reference images, diagrams, illustrations, figures, charts, photos, pictures, models shown, or "the diagram below/above". If a question needs visual data, describe it ENTIRELY in words inside the question_text (e.g., "A data table shows: Trial 1 = 5g, Trial 2 = 10g..." written out as text).

2. **EVERY QUESTION MUST BE FULLY SELF-CONTAINED.** A student reading ONLY the question_text (and answer options) must have everything they need. No external references, no "as discussed in class", no "using the model provided".

3. **ANSWER OPTIONS ARE REQUIRED FOR ALL CHOICE-BASED TYPES.**
   - multiple_choice_question: EXACTLY 4 options, EXACTLY ONE with weight 100, others weight 0. Never empty.
   - multiple_answers_question: EXACTLY 4-5 options, 2-3 with weight 100, rest weight 0. State in the stem: "Select ALL that apply."
   - data_analysis_question, scenario_question, investigation_design_question (when MC format): same rules as multiple_choice_question.
   - drag_and_drop_question / concept_map_question: at least 2 categories, each with at least 2 items. Stem must say: "Drag each item into the correct category."
   - multi_step_question: 2 parts minimum, each part with its own complete prompt and answer structure.
   - constructed_response_question: include prompt, scoring_rubric, AND sample_response. Stem must tell student what format the answer takes (e.g., "Write 2-3 sentences explaining...").

4. **CLEAR ACTION VERB IN EVERY STEM.** Start or end the question with an explicit instruction: "Which of the following...", "Select the BEST answer.", "Select ALL that apply.", "Drag each... into...", "Write a short response explaining...". Never leave students guessing what to do.

5. **PLAIN, DIRECT LANGUAGE.** Middle-school reading level. Define any technical term inline on first use. One question = one task.

6. **NO META-REFERENCES.** Never write "in the previous question", "see Part A above" outside of multi_step_question, or "your teacher said".

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
- Mix DOK levels: ~25% DOK 1, ~40% DOK 2, ~25% DOK 3, ~10% DOK 4
- Mix Bloom's levels appropriately
- For exams of 15 or more questions: include at least 3 constructed response, 2 investigation design, 3 data analysis, 3 scenario-based, and 2 concept mapping questions
- For shorter exams, use the same proportions without requiring more special item types than the total permits
- Remaining questions should be TEI (MC, select-all, drag-and-drop)
- Each question must specify which standard it assesses

## IMPORTANT:
- Questions should be challenging but fair for middle school students
- Use realistic scientific scenarios and data — described ENTIRELY in text, never via images
- Distractors should reflect common student misconceptions
- Multi-step questions should build logically
- Constructed responses should have clear rubric criteria in the scoring_rubric field AND a sample_response
- Every question MUST include a "hint" — a short (1-2 sentence) clue that nudges the student toward the correct concept without giving the answer away
- Before finalizing each question, re-read it and confirm: (a) no visual is referenced, (b) all answer options are present and non-empty, (c) the student knows exactly what action to take.`;

    const generateBatch = async (need: number, excludeStems: string[], attempt: number): Promise<any[]> => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: resolveModel(parsedBody, "heavy"),
          messages: [
            { role: "system", content: withUdl(systemPrompt, "ISAT practice exam: vary response formats across the exam per UDL Action & Expression (do not lean only on multiple choice). Use plain language in stems; define technical terms inline; design distractors that target real misconceptions, not language barriers. The 'hint' field doubles as a UDL Representation scaffold — make it concept-focused, not answer-leaking.") },
            { role: "user", content: `Generate exactly ${need} additional ISAT practice question${need === 1 ? "" : "s"} covering ${disciplineLabel}. This is attempt ${attempt}. Return exactly ${need}, no fewer. Keep the set text-only and self-contained.${excludeStems.length ? `\n\nDo not repeat or paraphrase these stems:\n${excludeStems.map((stem) => `- ${stem.slice(0, 180)}`).join("\n")}` : ""}` },
          ],
          tools: [{ type: "function", function: {
            name: "return_exam",
            description: "Return the requested ISAT practice questions",
            parameters: {
              type: "object",
              properties: { questions: { type: "array", minItems: need, maxItems: need, items: {
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
                        hint: { type: "string", description: "A short 1-2 sentence clue about the concept being tested, without giving the answer away" },
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
                      required: ["question_number", "question_type", "question_text", "standard_code", "points_possible", "dok_level", "blooms_level", "hint", "answers_json"],
                    } } }, required: ["questions"], additionalProperties: false,
            },
          } }],
          tool_choice: { type: "function", function: { name: "return_exam" } },
        }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        let gatewayMessage = `AI gateway error [${response.status}]`;
        try { gatewayMessage = JSON.parse(responseText)?.message ?? JSON.parse(responseText)?.error ?? gatewayMessage; } catch { /* retain status */ }
        throw new QuestionGenerationError(gatewayMessage, response.status, Number(response.headers.get("Retry-After")) || undefined);
      }
      const data = JSON.parse(responseText);
      const finishReason = data.choices?.[0]?.finish_reason ?? null;
      const argumentsText = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argumentsText) {
        console.warn(`ISAT attempt ${attempt} returned no tool call [finish_reason: ${finishReason}]`);
        return [];
      }
      try {
        const parsed = JSON.parse(argumentsText);
        const raw = Array.isArray(parsed?.questions) ? parsed.questions : [];
        console.log(`ISAT attempt ${attempt}: requested ${need}, raw ${raw.length} [finish_reason: ${finishReason}]`);
        return processQuestions(raw, false);
      } catch (error) {
        console.warn(`ISAT attempt ${attempt} parse failed:`, error instanceof Error ? error.message : error);
        return [];
      }
    };

    const { questions: exactQuestions, diagnostics } = await generateExactQuestions<any>({
      requested: requestedCount,
      getStem: (question) => question.question_text,
      validate: isQuestionValid,
      generateBatch,
    });
    const questions = exactQuestions.map((question, index) => ({ ...question, question_number: index + 1 }));
    console.log(`Generated exact ${questions.length}-question ISAT exam covering ${disciplineLabel}`);
    return respondWithQuestions(questions, requestedCount, diagnostics);
  } catch (e) {
    console.error("generate-isat-exam error:", e);
    const status = e instanceof QuestionGenerationError
      ? e.status
      : e instanceof ExactQuestionCountError ? 422 : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", ...(e instanceof ExactQuestionCountError ? { diagnostics: e.diagnostics } : {}) }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}));

// Detect references to visuals that don't exist in this text-only exam
const VISUAL_REGEX = /\b(diagram|illustration|figure|image|picture|photo(?:graph)?|chart|graph(?: shown| above| below)?|model shown|shown (?:above|below|here|in the figure)|see (?:the )?(?:figure|image|diagram|chart|graph)|refer to the (?:figure|image|diagram|chart|graph|illustration))\b/i;

const CHOICE_TYPES = new Set([
  "multiple_choice_question",
  "multiple_answers_question",
  "data_analysis_question",
  "scenario_question",
  "investigation_design_question",
]);

function isQuestionValid(q: any): { valid: boolean; reason?: string } {
  const text = String(q.question_text || "").trim();
  if (!text) return { valid: false, reason: "empty stem" };
  if (VISUAL_REGEX.test(text)) return { valid: false, reason: "references a visual" };

  const type = q.question_type;
  const a = q.answers;

  if (CHOICE_TYPES.has(type)) {
    if (!Array.isArray(a) || a.length < 2) return { valid: false, reason: "missing answer options" };
    const nonEmpty = a.filter((x: any) => String(x?.text || "").trim().length > 0);
    if (nonEmpty.length < 2) return { valid: false, reason: "answer options blank" };
    const correct = a.filter((x: any) => (x?.weight ?? 0) >= 100);
    if (correct.length < 1) return { valid: false, reason: "no correct answer marked" };
  } else if (type === "drag_and_drop_question" || type === "concept_map_question") {
    const cats = a?.categories;
    if (!Array.isArray(cats) || cats.length < 2) return { valid: false, reason: "drag-drop needs 2+ categories" };
    if (!cats.every((c: any) => Array.isArray(c?.items) && c.items.length > 0 && c.label)) {
      return { valid: false, reason: "drag-drop categories incomplete" };
    }
  } else if (type === "multi_step_question") {
    if (!Array.isArray(a?.parts) || a.parts.length < 2) return { valid: false, reason: "multi-step needs 2+ parts" };
  } else if (type === "constructed_response_question") {
    if (!a?.prompt && !text) return { valid: false, reason: "CR missing prompt" };
    if (!a?.scoring_rubric) return { valid: false, reason: "CR missing rubric" };
  }

  return { valid: true };
}

function processQuestions(raw: any[], filterInvalid = true): any[] {
  const processed = raw.map((q: any, idx: number) => {
    let answers: any = null;
    if (q.answers_json) {
      try {
        answers = typeof q.answers_json === "string" ? JSON.parse(q.answers_json) : q.answers_json;
      } catch {
        console.error(`Failed to parse answers_json for Q${idx + 1}`);
        answers = [];
      }
    }

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
      hint: q.hint || "",
      answers,
    };
  });

  if (!filterInvalid) return processed;
  // Filter out malformed questions and renumber
  const valid: any[] = [];
  const dropped: { n: number; reason: string }[] = [];
  for (const q of processed) {
    const check = isQuestionValid(q);
    if (check.valid) {
      valid.push(q);
    } else {
      dropped.push({ n: q.question_number, reason: check.reason || "unknown" });
    }
  }
  if (dropped.length > 0) {
    console.warn(`Dropped ${dropped.length} invalid questions:`, JSON.stringify(dropped));
  }
  return valid.map((q, i) => ({ ...q, question_number: i + 1 }));
}

function respondWithQuestions(questions: any[], requested: number, diagnostics: unknown) {
  return new Response(
    JSON.stringify({ questions, question_count: questions.length, requested, generated: questions.length, diagnostics }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
