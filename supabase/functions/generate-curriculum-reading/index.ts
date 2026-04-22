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

    // Full generation — 5-act narrative arc
    const FIVE_ACT_CONTRACT = `
FIVE-ACT NARRATIVE STRUCTURE (the reader never sees act labels — the structure is invisible in the prose):

ACT 1 — EXPOSITION (exactly 2 paragraphs).
- Set the scene of the scientific question or natural phenomenon at the heart of the lesson.
- Establish what was known (and what was NOT yet known) at the time, and why this question mattered to ordinary people then.
- Plant a hook that pulls the reader forward. No "Imagine..." openings.

ACT 2 — RISING ACTION (3-4 paragraphs). This is the STORY-RICH scientist section. REQUIRED to include:
- The scientist's birth era and place (year + city/region/country).
- Family and social context (class, religion, culture, what their parents did, siblings, formative childhood detail).
- What first drew them into science (a teacher, a book, a moment of wonder, a tragedy).
- Specific obstacles they faced — at least 2 named: poverty, prejudice, war, lack of equipment, scientific resistance, illness, gender or racial barriers, exile, personal loss.
- The exact problem they became obsessed with and WHY it haunted them.
- Sensory detail of daily life in their lab, study, or fieldwork (what the room smelled like, what tools they used, how long their days were).
- Treat the scientist as a CHARACTER, not a footnote. Paraphrased dialogue is allowed and encouraged.

ACT 3 — CLIMAX (2-3 paragraphs).
- The breakthrough moment, with real narrative tension: the failed attempts, the dead ends, the "aha" instant, the experiment or observation that finally cracked it.
- The final paragraph of this act MUST explicitly map the discovery onto the targeted content standard${ngss_standard ? ` (${ngss_standard})` : ""} so students see the connection between the human story and the science they are learning.

ACT 4 — FALLING ACTION (3-4 paragraphs). This is the deep teaching pass.
- Re-explain the underlying science thoroughly: mechanisms, cause and effect, vocabulary defined IN CONTEXT (inline parenthetical or em-dash definitions the first time a key term appears).
- Reference diagrams in prose ("picture two plates grinding past each other...").
- Name and correct at least one common misconception students typically hold about this concept.
- This is where students "get it" technically — be precise, not vague.

ACT 5 — DENOUEMENT (2-3 paragraphs).
- A modern, real-world case study showing the concept active in the world TODAY. Name the event, the place, and the year when possible (e.g., the 2011 Tōhoku earthquake, the 2021 Mauna Loa CO₂ readings, the 2020 Pfizer mRNA vaccine).
- Close the arc: connect this modern example back to the scientist's original question so the reader feels the through-line from past to present.

TOTAL paragraph budget: 12-16 narrative paragraphs across the five acts. Then append the UDL block (see below) AFTER the denouement.

PREFERRED SCIENTIST ROSTER (use one of these unless the standard genuinely makes it implausible):
- Albert Einstein (1879-1955, Germany/Switzerland/USA — relativity, photoelectric effect, quantum theory).
- Marie Curie (1867-1934, Poland/France — radioactivity, polonium, radium; only person to win Nobels in two sciences).
- Isaac Newton (1643-1727, England — gravity, motion, optics, calculus).
- Charles Darwin (1809-1882, England — evolution by natural selection, the Beagle voyage).
- Nikola Tesla (1856-1943, Serbia/USA — alternating current, electromagnetism, wireless power).
- Galileo Galilei (1564-1642, Italy — telescope, heliocentrism, kinematics; tried by the Inquisition).
- Ada Lovelace (1815-1852, England — first computer algorithm, Babbage's Analytical Engine).
- Pythagoras (c.570-495 BCE, Greece — geometry, ratios, mathematical philosophy).
- Carl Linnaeus (1707-1778, Sweden — binomial nomenclature, taxonomy of life).
- Rosalind Franklin (1920-1958, England — X-ray crystallography, Photo 51, DNA structure).

If none of these credibly fits the standard (e.g. modern plate tectonics, mRNA vaccines, climate science), pick another real, historically documented scientist and justify the choice naturally inside Act 2 — never invent a scientist.

ANTI-THINNESS GUARDRAILS (hard rules):
- No paragraph shorter than ~4 sentences. Aim for 5-7 sentences per paragraph.
- No vague summary lines like "this was a major discovery" or "this changed everything." Every claim must be SPECIFIC: what, where, who, when, why it mattered.
- The scientist's hardships, era, and personality are REQUIRED in Act 2, not optional.
- Do NOT print act labels ("Act 1", "Exposition", etc.) in the output prose. The structure must be invisible to the reader.
- Do NOT use bullet lists inside the reading paragraphs. Continuous narrative prose only.

STORYTELLING VOICE:
Warm, vivid, third-person narrator. Tell scenes, don't summarize them. Let the scientist speak (paraphrased dialogue is welcome). Ground every abstract idea in something physical and observable. Aim for the tone of a great middle-grade nonfiction book — *Hidden Figures Young Readers Edition*, *The Boy Who Harnessed the Wind*, *The Disappearing Spoon*. Curiosity-forward. Never condescending.`;

    const readingInstructions = `
IMPORTANT — Connected Reading (the central artifact of this lesson):
Generate a "reading" object with:
- reading_title: A plain, descriptive narrative title for the reading passage (e.g., "Marie Curie and the Hidden Element", "Galileo's Forbidden Sky"). Do NOT prefix the title with the standard code or any code at all — keep it human and inviting.
- reading_paragraphs: An array of 12-16 narrative paragraphs that follow the FIVE-ACT NARRATIVE STRUCTURE described in the system prompt, followed by the UDL closing block (inline vocabulary callouts already woven through the prose, then a "Try it your way" paragraph offering 2-3 engagement modes, then a clearly labeled "Reflect:" question). The act structure must be invisible to the reader — no headings, no labels.`;

    const formatInstructions = format === "textbook"
      ? `Output the lesson following the five-act narrative arc:
- title (plain, descriptive — no standard codes prefixed)
- objectives (3-5 measurable learning objectives)
- key_terms (8-12 {term, definition})
- intro (5-7 paragraphs): This is Acts 1 and 2 of the narrative — exposition (2 paragraphs setting the scientific scene of the era) followed by rising action (3-4 story-rich paragraphs introducing the scientist with full biographical depth: birth era + place, family/social context, what drew them to science, specific obstacles, the problem that obsessed them, sensory detail of their daily work). End with a clean segue sentence into the explanation. No "Imagine..." openings.
- explanation (3-4 paragraphs): This is Act 4 — the deep teaching pass. Re-explain the science thoroughly, define ALL key terms in context (inline parenthetical the first time a term appears), reference diagrams in prose, and correct at least one common misconception. Precise, not vague.
${readingInstructions}`
      : format === "scripted"
      ? `Output as scripted lesson plan:
- title (plain, descriptive — no standard codes prefixed)
- hook (3-5 paragraphs — open with the scientist's story per Acts 1-2 above)
- key_concepts (6-8 {heading, content})
- assignment ({title, description, instructions})
${readingInstructions}`
      : `Output in BOTH formats under "textbook" and "scripted" keys. Include "reading" at the top level.
FORMAT 1 "textbook": title (plain), objectives, key_terms, intro (Acts 1-2: exposition + story-rich scientist), explanation (Act 4: deep technical re-teaching with key terms inline)
FORMAT 2 "scripted": title (plain), hook (Acts 1-2 scientist story), key_concepts, assignment
${readingInstructions}`;

    const systemPrompt = `You are an expert middle school science curriculum designer specializing in NGSS-aligned lesson creation. Every reading you produce is a complete five-act narrative built around a real historical scientist, written for ${grade_level} students.
${FIVE_ACT_CONTRACT}

UDL OUTPUT REQUIREMENTS (appended AFTER the denouement, in the same reading_paragraphs array):
- Inline vocabulary callouts: weave a parenthetical or em-dash definition the first time each key term appears in the narrative — this is UDL Representation.
- A "Try it your way" paragraph offering students 2-3 different ways to engage with the idea (write, draw/diagram, talk it through, build/demonstrate) — UDL Action & Expression.
- A clearly labeled "Reflect:" paragraph with a metacognitive or relevance prompt — UDL Engagement / Self-Regulation.
These three UDL elements come AFTER Act 5 so they don't interrupt the narrative flow.`;

    const wrappedSystemPrompt = withUdl(systemPrompt, "Curriculum reading: bake UDL Engagement, Representation, and Action & Expression directly into the reading text. Surface vocabulary supports inline, give a 'Try it your way' choice block, and end with a reflection prompt — all AFTER the five-act narrative completes.");

    const userPrompt = `Create a ${grade_level} science lesson about "${subject_area}".

Learning Objectives: ${objectives}
${key_terms ? `Key Terms to include: ${key_terms}` : ""}
${ngss_standard ? `NGSS Standard: ${ngss_standard} — the climax (Act 3) must explicitly map the scientist's breakthrough onto this standard.` : ""}

Build the reading as a complete five-act narrative (12-16 paragraphs of prose) anchored in a real historical scientist — preferably one of the preferred roster — with full biographical depth in Act 2 (era, family, obstacles, daily life, the problem that obsessed them). Honor every anti-thinness guardrail: no paragraph under ~4 sentences, no vague summary lines, no act labels in the output prose. Then append the UDL block (inline vocabulary already woven in, a "Try it your way" paragraph, a "Reflect:" prompt).

The title MUST be plain and descriptive — do NOT prefix it with any standard code.

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
          { role: "system", content: wrappedSystemPrompt },
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

  const FIVE_ACT_REGEN = `

Build the reading as a complete FIVE-ACT NARRATIVE (12-16 paragraphs, prose only — never print act labels in the output):
1) EXPOSITION (2 paragraphs): scene of the scientific question; what was known and not known at the time; why it mattered.
2) RISING ACTION (3-4 story-rich paragraphs): introduce a real historical scientist with full biographical depth — birth era + place, family/social context, what drew them to science, at least 2 specific obstacles (poverty, prejudice, war, lack of equipment, scientific resistance, illness, gender/racial barriers, exile, personal loss), the problem that obsessed them, sensory detail of their daily lab/fieldwork life. Treat them as a character.
3) CLIMAX (2-3 paragraphs): the breakthrough with narrative tension — failed attempts, the "aha", the experiment that worked. Final paragraph of this act explicitly maps the discovery onto the targeted content standard${ngss_standard ? ` (${ngss_standard})` : ""}.
4) FALLING ACTION (3-4 paragraphs): deep technical re-teaching — mechanisms, vocabulary defined inline, diagrams referenced in prose, at least one common misconception named and corrected.
5) DENOUEMENT (2-3 paragraphs): a modern real-world case study (named event, place, year when possible) connecting back to the scientist's original question.

PREFERRED SCIENTISTS (pick one unless implausible for the standard): Einstein, Marie Curie, Newton, Darwin, Tesla, Galileo, Ada Lovelace, Pythagoras, Linnaeus, Rosalind Franklin. If none fit, choose another real, historically documented scientist — never invent one.

ANTI-THINNESS GUARDRAILS: no paragraph under ~4 sentences; no vague summary lines; specific (what/where/who/when/why) on every claim; the scientist's hardships, era, and personality are required, not optional; no act labels in output prose; no bullet lists inside paragraphs.

VOICE: warm, vivid, third-person narrator; scenes not summaries; paraphrased dialogue welcome; ground abstractions in physical detail; tone of *Hidden Figures Young Readers Edition* or *The Boy Who Harnessed the Wind*.

After Act 5, append the UDL block in the same paragraphs array: inline vocabulary callouts already woven through the prose, then a "Try it your way" paragraph (2-3 engagement modes), then a clearly labeled "Reflect:" prompt.`;

  const sectionConfigs: Record<string, { prompt: string; schema: any }> = {
    reading: {
      prompt: `Regenerate ONLY the reading passage for a lesson about "${subject_area}".${FIVE_ACT_REGEN}

The reading_title MUST be plain and descriptive (e.g., "Marie Curie and the Hidden Element") — do NOT prefix it with any standard code.`,
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
      prompt: `Regenerate ONLY the introduction (Acts 1 and 2 of the five-act narrative) for a lesson about "${subject_area}". Write 5-7 paragraphs total:
- First 2 paragraphs (EXPOSITION): set the scene of the scientific question or natural phenomenon, establish what was known and not known at the time, and plant a hook. No "Imagine..." openings.
- Next 3-4 paragraphs (RISING ACTION): introduce a real historical scientist (preferably from this roster: Einstein, Marie Curie, Newton, Darwin, Tesla, Galileo, Ada Lovelace, Pythagoras, Linnaeus, Rosalind Franklin) with full biographical depth — birth era + place, family/social context, what drew them to science, at least 2 specific obstacles (poverty, prejudice, war, lack of equipment, scientific resistance, illness, gender/racial barriers, exile, personal loss), the problem that obsessed them, and sensory detail of their daily lab or fieldwork. Treat them as a character — paraphrased dialogue welcome.
End with a clean segue sentence into the explanation.

ANTI-THINNESS: no paragraph under ~4 sentences; no vague summary lines; every claim specific (what, where, who, when, why). VOICE: warm, vivid, third-person — tone of a great middle-grade nonfiction book.`,
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
        { role: "system", content: withUdl(`You are an expert ${grade_level} science curriculum designer.`, "Section regeneration: keep UDL principles visible in the regenerated content (vocabulary supports, choice/multiple modes, reflection prompts where appropriate).") },
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
