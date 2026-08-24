import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";
import { resolveModel } from "../_shared/model.ts";
import { withUdl } from "../_shared/udl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return data.claims.sub as string;
}

// ─── Question generation prompt & schema ───────────────────────────────
function buildQuestionPrompt(opts: any) {
  const { standard_code, standard_description, count, subject, framework, dok_level } = opts;
  const isIdaho = framework === "Idaho";
  const subjectContext = isIdaho
    ? subject === "Math" ? "mathematics"
      : subject === "Social Studies" ? "social studies (world geography and history)"
      : "English Language Arts (reading comprehension, writing, vocabulary, grammar)"
    : "science";
  const gradeRange = "middle school, grades 6-8";
  const testName = "Idaho Standards Achievement Test (ISAT)";
  const frameworkLabel = isIdaho ? "Idaho Content Standard" : "NGSS standard";

  const questionTypes = subject === "Math"
    ? `1. "multiple_choice_question" - 4 options, one correct.\n2. "multiple_answers_question" - 4-5 options, 2-3 correct.\n3. "multi_step_question" - Multi-part (Part A, Part B).\n4. "drag_and_drop_question" - 2-3 categories with 4-8 items.`
    : subject === "ELA"
    ? `1. "multiple_choice_question" - 4 options, one correct.\n2. "multiple_answers_question" - 4-5 options, 2-3 correct.\n3. "multi_step_question" - Multi-part (Part A, Part B).\n4. "drag_and_drop_question" - 2-3 categories with 4-8 items.`
    : `1. "multiple_choice_question" - 4 options, one correct.\n2. "multiple_answers_question" - 4-5 options, 2-3 correct.\n3. "multi_step_question" - Multi-part (Part A, Part B).\n4. "drag_and_drop_question" - 2-3 categories with 4-8 items.`;

  const dokInstruction = dok_level
    ? `- Generate ALL questions at DOK Level ${dok_level}\n- Match Bloom's taxonomy levels appropriate for DOK ${dok_level}`
    : `- Include a range of DOK levels (1-3)\n- Vary Bloom's taxonomy levels`;

  const systemPrompt = `You are an expert ${gradeRange} ${subjectContext} assessment writer specializing in ${testName}-aligned questions.\n\nCreate a MIX of these question types:\n${questionTypes}\n\nHARD REQUIREMENT: return EXACTLY ${count} question${count === 1 ? "" : "s"} in the questions array — no fewer. Keep each question concise so the whole set fits in one response.\n\nGuidelines:\n- Questions should be grade-appropriate (${gradeRange})\n${dokInstruction}\n- Use real-world scenarios when possible`;

  const exclude: string[] = Array.isArray(opts.exclude_stems) ? opts.exclude_stems : [];
  const excludeBlock = exclude.length
    ? `\n\nDo NOT repeat or paraphrase these already-generated questions:\n${exclude.map((s: string) => `- ${String(s).slice(0, 160)}`).join("\n")}`
    : "";

  const userPrompt = `Generate exactly ${count} ${testName}-style ${subjectContext} question${count === 1 ? "" : "s"} for this ${frameworkLabel}:\n\nStandard: ${standard_code}\nDescription: ${standard_description}\n\nReturn all ${count} question${count === 1 ? "" : "s"} — do not stop early.${excludeBlock}`;

  const schema = {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          properties: {
            question_type: { type: "string" },
            question_text: { type: "string" },
            points_possible: { type: "number" },
            dok_level: { type: "number" },
            blooms_level: { type: "string" },
            answers_json: { type: "string" },
          },
          required: ["question_type", "question_text", "points_possible", "dok_level", "blooms_level", "answers_json"],
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  };

  return { systemPrompt, userPrompt, schema, toolName: "return_questions" };
}


// ─── Lesson plan generation prompt & schema ────────────────────────────
function buildLessonPrompt(opts: any) {
  const { standard_code, standard_description, count, subject } = opts;
  const gradeRange = "middle school, grades 6-8";

  const systemPrompt = `You are an expert ${gradeRange} ${subject || "science"} curriculum designer. Generate detailed, standards-aligned lesson plans with exactly 3 objectives, at least 4 activities with teacher scripts (8-15 sentences each), at least 4 vocabulary terms, and at least 3 reputable online resources per lesson.`;

  const userPrompt = `Generate ${count} lesson plan(s) for this standard:\n\nStandard: ${standard_code}\nDescription: ${standard_description}\n\nEach lesson should be engaging, include hands-on activities, and be appropriate for ${gradeRange} students.`;

  const schema = {
    type: "object",
    properties: {
      lessons: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            objectives: { type: "string", description: "3 objectives separated by newlines" },
            duration_minutes: { type: "number" },
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  duration: { type: "string" },
                  description: { type: "string" },
                  teacher_script: { type: "string" },
                },
                required: ["name", "duration", "description", "teacher_script"],
              },
            },
            vocabulary: {
              type: "array",
              items: {
                type: "object",
                properties: { term: { type: "string" }, definition: { type: "string" } },
                required: ["term", "definition"],
              },
            },
            materials: { type: "string" },
            assessment: { type: "string" },
            differentiation: { type: "string" },
            resources: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, url: { type: "string" }, description: { type: "string" } },
                required: ["title", "url", "description"],
              },
            },
          },
          required: ["title", "objectives", "duration_minutes", "activities", "vocabulary", "materials", "assessment", "differentiation", "resources"],
        },
      },
    },
    required: ["lessons"],
    additionalProperties: false,
  };

  return { systemPrompt, userPrompt, schema, toolName: "return_lessons" };
}

// ─── Reading / textbook generation prompt & schema ─────────────────────
function buildReadingPrompt(opts: any) {
  const { standard_code, standard_description, count, subject } = opts;
  const gradeRange = "middle school, grades 6-8";

  const systemPrompt = `You are an expert ${gradeRange} ${subject || "science"} curriculum designer who writes engaging, narrative-driven textbook content. You follow a proven three-part storytelling framework for every reading:

1. **Scientist Story Introduction** — Jump straight in and introduce a real, historically relevant scientist (or scientists) connected to the concept. Do NOT open with "Imagine..." or any hypothetical scenario — begin with the scientist directly. Develop the story richly: describe the historical era they lived in, the scientific landscape of the time, the specific problem or question that drove their work, the key experiments or observations they conducted, and the breakthrough they achieved. Include enough context about their life, challenges, and motivations that students understand WHY this research mattered. End this section with a clean, deliberate segue sentence that bridges the scientist's discovery into the technical explanation that follows.

2. **Technical Explanation** — After the story, transition into a clear, slightly technical explanation of the concept. Define and use all key vocabulary terms in context (bold or emphasize them). Explain the underlying mechanisms, principles, or processes. This section should be thorough but accessible — think "textbook meets storytelling."

3. **Student Connection** — Conclude with concrete, relatable examples of how this concept directly affects the student's daily life. Help them see why this matters to them personally — through everyday phenomena, health, technology, environmental impacts, or decisions they might make.

Create rich, detailed instructional readings appropriate for ${gradeRange} students. Each reading should be substantial in length (similar to "The Dance of Matter and Energy" — detailed paragraphs, not summaries).

CRITICAL TITLE FORMAT: The reading title MUST be prefixed with the standard code, followed by a colon and a descriptive curriculum-style title. For example: "MS-LS1-1: Investigating Cell Theory" or "MS-PS1-3: Understanding Chemical Reactions". Do NOT use creative/literary titles like "The Invisible Architects of Life" — use clear, curriculum-aligned titles that match what a lesson plan would be called.`;

  const userPrompt = `Generate ${count} textbook-style reading(s) for this standard:

Standard: ${standard_code}
Description: ${standard_description}

IMPORTANT — Title format: Every reading title MUST start with "${standard_code}: " followed by a clear, curriculum-style descriptive title (e.g., "${standard_code}: Investigating [Topic]"). Do NOT use creative literary titles.

Each reading MUST follow this three-part structure:

**Introduction (intro field, 4-6 paragraphs):** Jump straight in and introduce a real scientist — do NOT start with "Imagine..." or hypothetical scenarios. Develop their story richly: the era they lived in, the scientific landscape, the problem driving their work, their key experiments, and their breakthrough. Include enough life context and motivation that students understand why this research mattered. End with a clean segue sentence that bridges naturally into the technical explanation.

**Explanation (explanation field, 6-10 paragraphs):** Provide a detailed, slightly technical explanation of the concept. Use and define ALL key terms naturally within the text. Explain mechanisms, principles, and processes thoroughly.

**Connected Reading (reading_paragraphs field, 8-12 paragraphs):** Give real-world examples of how this concept directly impacts the student's life. Connect it to everyday experiences, health, technology, the environment, or decisions students face. Make it personal and relevant.

Also include: 3-5 learning objectives, 8-12 key vocabulary terms with definitions, and a reading_title for the connected reading passage.`;

  const schema = {
    type: "object",
    properties: {
      readings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            objectives: { type: "array", items: { type: "string" } },
            key_terms: {
              type: "array",
              items: {
                type: "object",
                properties: { term: { type: "string" }, definition: { type: "string" } },
                required: ["term", "definition"],
              },
            },
            intro: { type: "array", items: { type: "string" } },
            explanation: { type: "array", items: { type: "string" } },
            reading_title: { type: "string" },
            reading_paragraphs: { type: "array", items: { type: "string" } },
          },
          required: ["title", "objectives", "key_terms", "intro", "explanation", "reading_title", "reading_paragraphs"],
        },
      },
    },
    required: ["readings"],
    additionalProperties: false,
  };

  return { systemPrompt, userPrompt, schema, toolName: "return_readings" };
}

function udlHint(content_type: string) {
  return content_type === "questions"
    ? "Question sets: vary response formats across the set (do not produce all multiple-choice). For each question, embed plain-language phrasing, define any technical term inline, and ensure distractors are accessible."
    : content_type === "lesson_plan"
    ? "Lesson plans: include explicit UDL choice options for engagement, vocabulary supports under representation, and at least two ways students can demonstrate learning under action & expression."
    : "Reading: include inline vocabulary callouts (Representation), a 'Try it your way' choice block (Action & Expression), and a Reflect question (Engagement) at the end of the reading paragraphs.";
}

interface GatewayCallResult {
  result: any | null;
  finishReason: string | null;
  errorResponse: Response | null;
}

async function callGateway(
  apiKey: string,
  body: any,
  prompt: { systemPrompt: string; userPrompt: string; schema: unknown; toolName: string },
  content_type: string,
): Promise<GatewayCallResult> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveModel(body, "default"),
      messages: [
        { role: "system", content: withUdl(prompt.systemPrompt, udlHint(content_type)) },
        { role: "user", content: prompt.userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: prompt.toolName,
          description: `Return generated ${content_type}`,
          parameters: prompt.schema,
        },
      }],
      tool_choice: { type: "function", function: { name: prompt.toolName } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return {
        result: null, finishReason: null,
        errorResponse: new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
    if (response.status === 402) {
      return {
        result: null, finishReason: null,
        errorResponse: new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
    const t = await response.text();
    console.error("AI error:", response.status, t.substring(0, 500));
    throw new Error(`AI gateway error [${response.status}]`);
  }

  const data = await response.json();
  const finishReason = data.choices?.[0]?.finish_reason ?? null;
  if (finishReason && finishReason !== "stop" && finishReason !== "tool_calls") {
    console.warn(`AI finish_reason: ${finishReason} — response may be truncated`);
  }

  let result: any = null;

  // Shape 1: tool_calls (expected)
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const raw = toolCall.function.arguments;
      result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    } catch (e) {
      console.error("Failed to parse tool_call arguments:", (e as Error).message, String(toolCall.function.arguments).substring(0, 500));
    }
  }

  // Shape 2: plain message content (fallback)
  if (!result) {
    const raw = data.choices?.[0]?.message?.content || "";
    if (raw) {
      try {
        const cleaned = raw.replace(/```json\n?|```/g, "").trim();
        const matched = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (matched) result = JSON.parse(matched[0]);
      } catch (e) {
        console.error("Failed to parse content fallback:", (e as Error).message, raw.substring(0, 500));
      }
    }
  }

  if (!result) {
    console.error("Could not extract JSON from AI response:", JSON.stringify(data).substring(0, 1000));
  }

  return { result, finishReason, errorResponse: null };
}

/** Tolerant JSON parse: handles double-encoded and over-escaped strings from the model. */
function parseAnswersJson(raw: string): any {
  const attempts = [raw, raw.replace(/\\\\n/g, "\\n").replace(/\\n/g, " "), raw.replace(/\\+/g, "\\")];
  for (const candidate of attempts) {
    try {
      let parsed = JSON.parse(candidate);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      return parsed;
    } catch { /* try next */ }
  }
  console.error("Failed to parse answers_json:", String(raw).substring(0, 300));
  return [];
}

function normalizeQuestion(q: any) {
  let answers = q.answers;
  if (q.answers_json) {
    answers = parseAnswersJson(String(q.answers_json));
  }

  if (Array.isArray(answers)) {
    answers = answers.map((a: any) => ({ text: a.text, weight: a.weight ?? (a.correct ? 100 : 0) }));
  }
  if (answers?.options && Array.isArray(answers.options)) {
    answers = answers.options.map((o: any) => ({ text: o.text, weight: o.correct ? 100 : 0 }));
  }
  const { answers_json, ...rest } = q;
  return { ...rest, answers };
}

const QUESTION_BATCH_SIZE = 5;
const MAX_QUESTION_ATTEMPTS = 3;

serve(withLogging("generate-content", async (req) => {

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireAuth(req);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return new Response(JSON.stringify({ error: "Request body is empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let body;
    try { body = JSON.parse(rawBody); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { content_type, standard_code, standard_description, count = 10, subject, framework = "NGSS", dok_level } = body;

    if (!content_type || !standard_code || !standard_description) {
      throw new Error("content_type, standard_code, and standard_description are required");
    }

    // ─── Questions: chunked generation with top-up loop ───────────────
    if (content_type === "questions") {
      const requested = Math.max(1, Number(count) || 1);
      const collected: any[] = [];
      let batchStart = 0;

      while (collected.length < requested) {
        const remainingTotal = requested - collected.length;
        const target = Math.min(QUESTION_BATCH_SIZE, remainingTotal);
        let batchCollected = 0;

        for (let attempt = 0; attempt < MAX_QUESTION_ATTEMPTS && batchCollected < target; attempt++) {
          const need = target - batchCollected;
          const prompt = buildQuestionPrompt({
            standard_code, standard_description, subject, framework, dok_level,
            count: need,
            exclude_stems: collected.map((q: any) => q.question_text).filter(Boolean),
          });

          const { result, finishReason, errorResponse } = await callGateway(
            LOVABLE_API_KEY, body, prompt, content_type,
          );
          if (errorResponse) {
            if (collected.length > 0) break;
            return errorResponse;
          }

          const got = Array.isArray(result?.questions) ? result.questions : [];
          console.log(
            `Questions batch (need ${need}) returned ${got.length}` +
            (finishReason ? ` [finish_reason: ${finishReason}]` : ""),
          );
          for (const q of got) {
            if (batchCollected >= target) break;
            if (!q?.question_text) continue;
            collected.push(normalizeQuestion(q));
            batchCollected++;
          }
        }

        if (batchCollected === 0) {
          console.error(`No questions produced for batch starting at ${batchStart}; stopping.`);
          break;
        }
        batchStart += batchCollected;
      }

      if (collected.length === 0) throw new Error("Failed to parse AI response");

      console.log(`Generated ${collected.length} of ${requested} requested questions for ${standard_code}`);

      return new Response(
        JSON.stringify({ questions: collected, requested, returned: collected.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Lessons / readings: single call ──────────────────────────────
    const opts = { standard_code, standard_description, count, subject, framework, dok_level };
    const prompt = content_type === "lesson_plan"
      ? buildLessonPrompt(opts)
      : content_type === "reading"
      ? buildReadingPrompt(opts)
      : (() => { throw new Error(`Unknown content_type: ${content_type}`); })();

    console.log(`Generating ${content_type} for ${standard_code} (count: ${count})`);

    const { result, errorResponse } = await callGateway(LOVABLE_API_KEY, body, prompt, content_type);
    if (errorResponse) return errorResponse;
    if (!result) throw new Error("Failed to parse AI response");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("generate-content error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
