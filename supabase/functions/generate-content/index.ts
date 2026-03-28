import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

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

  const systemPrompt = `You are an expert ${gradeRange} ${subjectContext} assessment writer specializing in ${testName}-aligned questions.\n\nCreate a MIX of these question types:\n${questionTypes}\n\nGuidelines:\n- Questions should be grade-appropriate (${gradeRange})\n${dokInstruction}\n- Use real-world scenarios when possible`;

  const userPrompt = `Generate ${count} ${testName}-style ${subjectContext} questions for this ${frameworkLabel}:\n\nStandard: ${standard_code}\nDescription: ${standard_description}`;

  const schema = {
    type: "object",
    properties: {
      questions: {
        type: "array",
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

1. **Scientist Story Introduction** — Open by introducing a real, historically relevant scientist (or scientists) connected to the concept. Tell their story as a narrative: what problem they faced, what observations or experiments they conducted, and what breakthrough they achieved. This should read like a compelling mini-biography that naturally leads into the concept. Use vivid, age-appropriate language that makes the scientist relatable to ${gradeRange} students.

2. **Technical Explanation** — After the story, transition into a clear, slightly technical explanation of the concept. Define and use all key vocabulary terms in context (bold or emphasize them). Explain the underlying mechanisms, principles, or processes. This section should be thorough but accessible — think "textbook meets storytelling."

3. **Student Connection** — Conclude with concrete, relatable examples of how this concept directly affects the student's daily life. Help them see why this matters to them personally — through everyday phenomena, health, technology, environmental impacts, or decisions they might make.

Create rich, detailed instructional readings appropriate for ${gradeRange} students. Each reading should be substantial in length (similar to "The Dance of Matter and Energy" — detailed paragraphs, not summaries).`;

  const userPrompt = `Generate ${count} textbook-style reading(s) for this standard:

Standard: ${standard_code}
Description: ${standard_description}

Each reading MUST follow this three-part structure:

**Introduction (intro field, 4-6 paragraphs):** Tell the story of a real scientist (or scientists) who contributed to understanding this concept. Include their historical context, the problem they were trying to solve, their key experiments or observations, and their breakthrough. Write it as an engaging narrative.

**Explanation (explanation field, 6-10 paragraphs):** Provide a detailed, slightly technical explanation of the concept. Use and define ALL key terms naturally within the text. Explain mechanisms, principles, and processes thoroughly.

**Connected Reading (reading_paragraphs field, 8-12 paragraphs):** Give real-world examples of how this concept directly impacts the student's life. Connect it to everyday experiences, health, technology, the environment, or decisions students face. Make it personal and relevant.

Also include: a compelling title, 3-5 learning objectives, 8-12 key vocabulary terms with definitions, and a reading_title for the connected reading passage.`;

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

    const opts = { standard_code, standard_description, count, subject, framework, dok_level };
    let prompt;
    if (content_type === "questions") {
      prompt = buildQuestionPrompt(opts);
    } else if (content_type === "lesson_plan") {
      prompt = buildLessonPrompt(opts);
    } else if (content_type === "reading") {
      prompt = buildReadingPrompt(opts);
    } else {
      throw new Error(`Unknown content_type: ${content_type}`);
    }

    console.log(`Generating ${content_type} for ${standard_code} (count: ${count})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt.systemPrompt },
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
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t.substring(0, 500));
      throw new Error(`AI gateway error [${response.status}]`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: try parsing content
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        throw new Error("Failed to parse AI response");
      }
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Normalize question answers
    if (content_type === "questions" && result.questions) {
      result.questions = result.questions.map((q: any) => {
        let answers = q.answers;
        if (q.answers_json) {
          try { answers = JSON.parse(q.answers_json); } catch { answers = []; }
        }
        if (Array.isArray(answers)) {
          answers = answers.map((a: any) => ({ text: a.text, weight: a.weight ?? (a.correct ? 100 : 0) }));
        }
        if (answers?.options && Array.isArray(answers.options)) {
          answers = answers.options.map((o: any) => ({ text: o.text, weight: o.correct ? 100 : 0 }));
        }
        const { answers_json, ...rest } = q;
        return { ...rest, answers };
      });
    }

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
