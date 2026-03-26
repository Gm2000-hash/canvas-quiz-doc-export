import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireAuth(req);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
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
        LOVABLE_API_KEY,
      });
    }

    // Full generation
    const readingInstructions = `
IMPORTANT — Connected Reading:
Also generate a "reading" object with:
- reading_title: A compelling title for a standalone reading passage connected to the lesson topic
- reading_paragraphs: Array of 8-12 detailed, engaging paragraphs that form a cohesive reading passage. Write at a middle-school reading level with rich vocabulary.`;

    const formatInstructions = format === "textbook"
      ? `Output the lesson:
- title, objectives (3-5), key_terms (8-12 {term, definition}), intro (6-8 paragraphs), explanation (8-12 paragraphs)
${readingInstructions}`
      : format === "scripted"
      ? `Output as scripted lesson plan:
- title, hook (3-5 paragraphs), key_concepts (6-8 {heading, content}), assignment ({title, description, instructions})
${readingInstructions}`
      : `Output in BOTH formats under "textbook" and "scripted" keys. Include "reading" at the top level.
FORMAT 1 "textbook": title, objectives, key_terms, intro, explanation
FORMAT 2 "scripted": title, hook, key_concepts, assignment
${readingInstructions}`;

    const systemPrompt = `You are an expert middle school science curriculum designer specializing in NGSS-aligned lesson creation. You write engaging, narrative-driven lessons appropriate for ${grade_level} students.`;

    const userPrompt = `Create a ${grade_level} science lesson about "${subject_area}".

Learning Objectives: ${objectives}
${key_terms ? `Key Terms to include: ${key_terms}` : ""}
${ngss_standard ? `NGSS Standard: ${ngss_standard}` : ""}

${formatInstructions}

Return ONLY valid JSON (no markdown).`;

    const readingSchema = {
      type: "object",
      properties: {
        reading_title: { type: "string" },
        reading_paragraphs: { type: "array", items: { type: "string" } },
        reading_questions: { type: "array", items: { type: "object" } },
      },
      required: ["reading_title", "reading_paragraphs", "reading_questions"],
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
          quiz: { type: "array", items: { type: "object" } },
        },
        required: ["title", "objectives", "key_terms", "intro", "explanation", "quiz"],
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
        model: "google/gemini-3-flash-preview",
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
});

async function handleRegeneration(opts: {
  regenerate_section: string;
  existing_lesson: any;
  subject_area: string;
  objectives: string;
  key_terms?: string;
  grade_level: string;
  LOVABLE_API_KEY: string;
}) {
  const { regenerate_section, existing_lesson, subject_area, objectives, key_terms, grade_level, LOVABLE_API_KEY } = opts;

  const sectionConfigs: Record<string, { prompt: string; schema: any }> = {
    reading: {
      prompt: `Regenerate ONLY the reading passage for a lesson about "${subject_area}". Create a compelling non-fiction reading with 8-12 paragraphs and 4-5 comprehension questions.`,
      schema: { type: "object", properties: { reading_title: { type: "string" }, reading_paragraphs: { type: "array", items: { type: "string" } }, reading_questions: { type: "array", items: { type: "object" } } }, required: ["reading_title", "reading_paragraphs", "reading_questions"] },
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
      prompt: `Regenerate ONLY the introduction. Write 4-6 narrative paragraphs.`,
      schema: { type: "object", properties: { intro: { type: "array", items: { type: "string" } } }, required: ["intro"] },
    },
    explanation: {
      prompt: `Regenerate ONLY the explanation section. Write 6-8 detailed concept paragraphs.`,
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
      model: "google/gemini-3-flash-preview",
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
