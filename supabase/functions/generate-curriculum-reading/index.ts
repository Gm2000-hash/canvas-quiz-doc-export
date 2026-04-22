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
  if (!authHeader) throw new Error("Missing Authorization header");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

serve(withLogging("generate-curriculum-reading", async (req) => {
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
    const {
      subject_area,
      objectives,
      key_terms,
      ngss_standard,
      grade_level = "8th grade",
      format = "both", // "textbook" | "scripted" | "both"
      regenerate_section,
      existing_lesson,
    } = body;

    if (!objectives || !subject_area) {
      throw new Error("objectives and subject_area are required");
    }

    // Section regeneration
    if (regenerate_section && existing_lesson) {
      return await handleRegeneration({
        regenerate_section,
        existing_lesson,
        subject_area,
        objectives,
        key_terms,
        grade_level,
        ngss_standard,
        LOVABLE_API_KEY,
      });
    }

    // Full generation
    const readingInstructions = `
IMPORTANT — Connected Reading:
Also generate a "reading" object with:
- reading_title: A compelling title for a standalone reading passage about how this concept affects the student's daily life.${ngss_standard ? ` IMPORTANT: The reading_title MUST begin with the standard code "${ngss_standard}" followed by a colon and space, then the title. Example: "${ngss_standard}: How Plate Tectonics Shape Our World"` : ""}
- reading_paragraphs: Array of 8-12 detailed paragraphs with concrete, relatable examples of how this concept directly impacts students — through everyday phenomena, health, technology, environmental impacts, or decisions they might make.`;

    const formatInstructions = format === "textbook"
      ? `Output the lesson following this three-part storytelling structure:
- title
- objectives (3-5 measurable learning objectives)
- key_terms (8-12 {term, definition})
- intro (6-8 paragraphs): Jump straight in and introduce a real scientist — do NOT start with "Imagine..." or hypothetical scenarios. Develop their story richly: the historical era, the scientific landscape, the specific problem driving their work, their key experiments, and their breakthrough. Include enough context about their life, challenges, and motivations that students understand WHY this research mattered. End with a clean segue sentence bridging into the explanation.
- explanation (8-12 paragraphs): Provide a detailed, slightly technical explanation of the concept. Use and define ALL key terms naturally within the text. Explain mechanisms, principles, and processes thoroughly.
${readingInstructions}`
      : format === "scripted"
      ? `Output as scripted lesson plan:
- title, hook (3-5 paragraphs — open with a scientist's story), key_concepts (6-8 {heading, content}), assignment ({title, description, instructions})
${readingInstructions}`
      : `Output in BOTH formats under "textbook" and "scripted" keys. Include "reading" at the top level.
FORMAT 1 "textbook": title, objectives, key_terms, intro (scientist story narrative), explanation (technical with key terms)
FORMAT 2 "scripted": title, hook (scientist story), key_concepts, assignment
${readingInstructions}`;

    const systemPrompt = `You are an expert middle school science curriculum designer specializing in NGSS-aligned lesson creation. You follow a proven three-part storytelling framework:

1. **Scientist Story Introduction** — Jump straight in and introduce a real, historically relevant scientist (or scientists) connected to the concept. Do NOT open with "Imagine..." or any hypothetical scenario — begin with the scientist directly. Develop the story richly: the historical era they lived in, the scientific landscape, the specific problem driving their work, their key experiments or observations, and their breakthrough. Include enough context about their life, challenges, and motivations that students understand WHY this research mattered. End with a clean segue sentence that bridges into the technical explanation.

2. **Technical Explanation** — Transition into a clear, slightly technical explanation. Define and use all key vocabulary terms in context. Explain underlying mechanisms and processes thoroughly but accessibly.

3. **Student Connection** — Conclude with concrete examples of how the concept directly affects students' daily lives.

Write engaging, narrative-driven lessons appropriate for ${grade_level} students. Each reading should be substantial in length — detailed paragraphs, not summaries.

UDL OUTPUT REQUIREMENTS for this lesson:
- Inside the reading, weave in inline vocabulary callouts (a parenthetical or em-dash definition the first time a key term appears) — this is UDL Representation.
- The reading_paragraphs MUST end with a "Try it your way" paragraph offering students 2-3 different ways to engage with the idea (write, draw/diagram, talk it through, build/demonstrate) — this is UDL Action & Expression.
- The reading_paragraphs MUST also end with a clearly labeled "Reflect:" question that prompts metacognition or relevance — this is UDL Engagement / Self-Regulation.`;

    const wrappedSystemPrompt = withUdl(systemPrompt, "Curriculum reading: bake UDL Engagement, Representation, and Action & Expression directly into the reading text. Surface vocabulary supports inline, give a 'Try it your way' choice block, and end with a reflection prompt.");

    const userPrompt = `Create a ${grade_level} science lesson about "${subject_area}".

Learning Objectives: ${objectives}
${key_terms ? `Key Terms to include: ${key_terms}` : ""}
${ngss_standard ? `NGSS Standard: ${ngss_standard}` : ""}

IMPORTANT: The introduction MUST jump straight into a real scientist's story — do NOT start with "Imagine..." or hypothetical scenarios. Develop the scientist's context, era, motivations, and breakthrough richly. End the intro with a clean segue into the explanation. The explanation MUST use key terms in context. The connected reading MUST show how this concept affects students personally.

${formatInstructions}

Return ONLY valid JSON (no markdown).`;

    const readingSchema = {
      type: "object",
      properties: {
        reading_title: { type: "string" },
        reading_paragraphs: { type: "array", items: { type: "string" } },
      },
      required: ["reading_title", "reading_paragraphs"],
    };

    const lessonSchema: any = {
      type: "object",
      properties: { reading: readingSchema },
      required: ["reading"],
    };

    if (format === "textbook" || format === "both") {
      const tbProps = {
        type: "object",
        properties: {
          title: { type: "string" },
          objectives: { type: "array", items: { type: "string" } },
          key_terms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } }, required: ["term", "definition"] } },
          intro: { type: "array", items: { type: "string" } },
          explanation: { type: "array", items: { type: "string" } },
        },
        required: ["title", "objectives", "key_terms", "intro", "explanation"],
      };
      if (format === "both") {
        lessonSchema.properties.textbook = tbProps;
        lessonSchema.required.push("textbook");
      } else {
        Object.assign(lessonSchema.properties, tbProps.properties);
        lessonSchema.required.push(...tbProps.required);
      }
    }

    if (format === "scripted" || format === "both") {
      const scProps = {
        type: "object",
        properties: {
          title: { type: "string" },
          hook: { type: "array", items: { type: "string" } },
          key_concepts: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } }, required: ["heading", "content"] } },
          assignment: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, instructions: { type: "string" } }, required: ["title", "description", "instructions"] },
          formative_assessment: { type: "array", items: { type: "object" } },
        },
        required: ["title", "hook", "key_concepts", "assignment", "formative_assessment"],
      };
      if (format === "both") {
        lessonSchema.properties.scripted = scProps;
        lessonSchema.required.push("scripted");
      } else {
        Object.assign(lessonSchema.properties, scProps.properties);
        lessonSchema.required.push(...scProps.required);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveModel(body, "heavy"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_lesson",
            description: "Return the generated lesson plan",
            parameters: lessonSchema,
          },
        }],
        tool_choice: { type: "function", function: { name: "return_lesson" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
        return new Response(JSON.stringify({ lesson: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch { throw new Error("Failed to parse AI response"); }
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ lesson: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));

async function handleRegeneration(opts: {
  regenerate_section: string;
  existing_lesson: any;
  subject_area: string;
  objectives: string;
  key_terms?: string;
  grade_level: string;
  ngss_standard?: string;
  LOVABLE_API_KEY: string;
}) {
  const { regenerate_section, existing_lesson, subject_area, objectives, key_terms, grade_level, ngss_standard, LOVABLE_API_KEY } = opts;

  const standardTitleInstruction = ngss_standard
    ? ` IMPORTANT: The reading_title MUST begin with the standard code "${ngss_standard}" followed by a colon and space, then the title.`
    : "";

  const sectionConfigs: Record<string, { prompt: string; schema: any }> = {
    reading: {
      prompt: `Regenerate ONLY the reading passage for a lesson about "${subject_area}". Write 8-12 paragraphs focused on how this concept directly affects and connects to the student's daily life — through everyday phenomena, health, technology, environmental impacts, or personal decisions.${standardTitleInstruction}`,
      schema: { type: "object", properties: { reading_title: { type: "string" }, reading_paragraphs: { type: "array", items: { type: "string" } } }, required: ["reading_title", "reading_paragraphs"] },
    },
    objectives: {
      prompt: `Regenerate ONLY the objectives for this lesson. Write 3-5 clear, measurable learning objectives.`,
      schema: { type: "object", properties: { objectives: { type: "array", items: { type: "string" } } }, required: ["objectives"] },
    },
    key_terms: {
      prompt: `Regenerate ONLY the key terms. Create 8-12 terms with clear definitions.`,
      schema: { type: "object", properties: { key_terms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } }, required: ["term", "definition"] } } }, required: ["key_terms"] },
    },
    intro: {
      prompt: `Regenerate ONLY the introduction for a lesson about "${subject_area}". Jump straight in and introduce a real, historically relevant scientist — do NOT start with "Imagine..." or hypothetical scenarios. Develop their story richly: describe the historical era they lived in, the scientific landscape of the time, the specific problem driving their work, their key experiments or observations, and their breakthrough. Include enough context about their life, challenges, and motivations that students understand WHY this research mattered. Write 5-7 narrative paragraphs and end with a clean segue sentence that bridges naturally into the technical explanation.`,
      schema: { type: "object", properties: { intro: { type: "array", items: { type: "string" } } }, required: ["intro"] },
    },
    explanation: {
      prompt: `Regenerate ONLY the explanation section for a lesson about "${subject_area}". Write 6-8 detailed paragraphs providing a slightly technical explanation of the concept. Define and use all key terms naturally within the text. Explain mechanisms, principles, and processes thoroughly but accessibly.`,
      schema: { type: "object", properties: { explanation: { type: "array", items: { type: "string" } } }, required: ["explanation"] },
    },
    quiz: {
      prompt: `Regenerate ONLY the quiz questions. Create 10-15 varied assessment questions.`,
      schema: { type: "object", properties: { quiz: { type: "array", items: { type: "object" } } }, required: ["quiz"] },
    },
  };

  const config = sectionConfigs[regenerate_section];
  if (!config) throw new Error(`Unknown section: ${regenerate_section}`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveModel(opts as any, "heavy"),
      messages: [
        { role: "system", content: `You are an expert ${grade_level} science curriculum designer.` },
        { role: "user", content: `${config.prompt}\n\nContext — Objectives: ${objectives}\n${key_terms ? `Key terms: ${key_terms}` : ""}\n\nExisting lesson content: ${JSON.stringify(existing_lesson).slice(0, 2000)}` },
      ],
      tools: [{
        type: "function",
        function: { name: "return_section", description: "Return the regenerated section", parameters: config.schema },
      }],
      tool_choice: { type: "function", function: { name: "return_section" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  const result = toolCall ? JSON.parse(toolCall.function.arguments) : JSON.parse((data.choices?.[0]?.message?.content || "{}").replace(/```json\n?|```/g, "").trim());

  return new Response(JSON.stringify({ data: result[regenerate_section] || result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
