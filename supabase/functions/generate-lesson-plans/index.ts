import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";
import { resolveModel } from "../_shared/model.ts";
import { withUdl } from "../_shared/udl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

serve(withLogging("generate-lesson-plans", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log("Authenticated generate-lesson-plans request from", userId);
    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return new Response(JSON.stringify({ error: "Request body is empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { unitTitle, discipline, gradeLevel, topic, numLessons, additionalContext } = JSON.parse(rawBody);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const baseSystemPrompt = `You are an expert middle school science teacher creating FULLY SCRIPTED, classroom-ready lesson plans aligned to NGSS and Universal Design for Learning (CAST UDL Guidelines v2.2).
You must return structured lesson plans using the provided tool.
Each lesson should be practical, engaging, and age-appropriate for ${gradeLevel || "middle school"} students.
Focus on ${discipline || "science"} content.

CRITICAL REQUIREMENTS FOR DETAIL:
- OBJECTIVES: Write EXACTLY 3 specific, measurable learning objectives using Bloom's taxonomy verbs. Include the FULL TEXT of each aligned NGSS performance expectation (not just the code).
- ACTIVITIES: Include AT LEAST 4 distinct activities per lesson. For EVERY activity, provide KEY TALKING POINTS, BACKGROUND INFORMATION (3-5 sentences of deep content knowledge with misconceptions), STUDENT ENGAGEMENT (questions + anticipated responses), and STEP-BY-STEP PROCEDURE. 8-15 sentences minimum per activity.
- MATERIALS: Specific items with quantities.
- ASSESSMENT: Specific formative + summative strategies with example items/rubric criteria.
- DIFFERENTIATION: Specific accommodations for ELL, IEP, gifted, struggling readers — tag each with the UDL principle it serves.
- NOTES: Teacher tips + common misconceptions + corrections.
- RESOURCES: At least 3 real working URLs (mix of video, article, activity).
- VOCABULARY: AT LEAST 4 key terms with student-friendly definitions.
- NGSS STANDARDS: At least 1 NGSS MS standard per lesson with COMPLETE text. MANDATORY.

═══════════════════════════════════════════════════════════════
UDL_SUPPORTS — STRUCTURED, CLASSROOM-READY (REQUIRED)
═══════════════════════════════════════════════════════════════
You MUST populate every sub-field of udl_supports with concrete, specific, classroom-ready content. Generic platitudes like "differentiate as needed" or "provide visuals" are FORBIDDEN. Every prose field is 2-4 sentences naming the actual artifact, prompt, or move the teacher will use.

ENGAGEMENT (the WHY of learning):
  • hook (2-4 sentences): An authentic, relevant opener tied to students' real lives or current events. Name the artifact (image, headline, short clip, story, demo). Example: "Open with a 90-second NASA clip of the Mars rover landing, then ask: 'If we sent YOU to design the next rover, what would worry you most?' Pair-share for 60 seconds before sharing out."
  • student_choice (ARRAY of ≥3 strings): Concrete CHOICE options across path, partner, or product. Each item is a full sentence describing the option. Example: ["Choose to work solo or with a partner of your choice", "Choose to demonstrate understanding by sketching, writing, or recording a 60-second voice memo", "Choose either the cell-phone case or the bridge as your design challenge context"].
  • collaboration (2-4 sentences): A specific grouping move with role names or a structured protocol (think-pair-share, jigsaw, gallery walk, fishbowl, expert groups). Name how groups are formed and what each role does.
  • sustain_effort (2-4 sentences): How challenge is varied (tiered tasks, extension cards, must-do/may-do) AND how mastery-oriented feedback is delivered (specific feedback stems, peer feedback protocol, conferring schedule).
  • self_regulation_prompt (1-2 sentences): A concrete mid-lesson reflection or coping cue students respond to. Example: "Pause-and-rate: On a 1-3 scale, how confident are you right now? If you're at 1, raise the ✋ card or grab a hint card from the table."

REPRESENTATION (the WHAT of learning):
  • visual (2-4 sentences): At least one specific visual alternative — diagram, anchor chart, slideshow, model, infographic, video clip with captions. Name what it looks like and what concept it represents.
  • auditory (2-4 sentences): A specific auditory option — teacher read-aloud, podcast clip, partner read, text-to-speech for the digital handout, recorded mini-lecture. Name the source.
  • text_supports (2-4 sentences): Specific text scaffolds — outline organizer, sentence stems, summary frame, color-coded notes guide, glossary card. Describe the format students receive.
  • vocabulary_scaffolds (ARRAY of ≥3 objects): Beyond the main vocabulary list. Each object MUST include: term (the word), student_friendly (a kid-friendly rephrase in plain language, NOT the dictionary definition), visual_cue (a concrete image, gesture, or analogy students can picture). Example: { "term": "tectonic plate", "student_friendly": "huge slabs of Earth's crust that float on hot melted rock and very slowly bump into each other", "visual_cue": "show a cracked hard-boiled egg on the desk; the shell pieces are the plates" }.
  • big_idea_highlight (1-2 sentences): The single most important takeaway students MUST walk away knowing today, written in plain language as if for a poster.
  • background_activation (2-4 sentences): A specific move to activate prior knowledge — KWL, quick-write, picture prompt, "What do you already know about ___?" Name the prompt verbatim.

ACTION & EXPRESSION (the HOW of learning):
  • response_modes (ARRAY of ≥3 strings): The distinct ways students may respond/produce work today. Choose from: written, verbal, sketched/diagram, built/model, demonstrated/role-play, recorded (audio/video), digital (slides/doc), kinesthetic. Example: ["written paragraph in science notebook", "sketched labeled diagram on whiteboard", "recorded 60-second voice memo on Flipgrid"].
  • physical_action_options (2-4 sentences): A specific movement, manipulative, or hands-on option. Name the materials. Example: "Provide foam tectonic plate cutouts and a felt 'mantle' mat at each table; students physically slide the plates to model convergent, divergent, and transform boundaries."
  • planning_scaffold (2-4 sentences): A concrete organizer or cue students use to plan their work. Example: "Hand each student a 'My Plan' sticky note with the prompt: 'I will use ___ (text, video, model) to learn ___, and I will show what I know by ___ (writing, drawing, recording).'"
  • progress_checkpoint (2-4 sentences): A specific mid-task self-check. Example: "Halfway through the lab, students complete a 30-second 'Stop & Self-Check': 'Have I labeled all 3 layers? Did I record temperature readings? If no, fix before continuing.'"
  • flexible_assessment (2-4 sentences): At least 2 distinct ways students can demonstrate mastery on the lesson goal. Name both. Example: "Option A: Write a 5-sentence CER (Claim, Evidence, Reasoning) paragraph. Option B: Record a 90-second screencast explaining the diagram you built. Both are scored on the same 4-point rubric."

CLOSING REFLECTION:
  • reflection_prompt (1-2 sentences): A single classroom-ready metacognitive question students answer at lesson close. Example: "What is one idea you understand more clearly now, and one question you still have? Write 2-3 sentences in your science notebook."

NEVER leave any UDL sub-field blank, vague, or under-detailed. If you cannot think of a specific move, invent a plausible classroom-ready one — do not produce one-line summaries.`;
    const systemPrompt = withUdl(baseSystemPrompt);

    const userPrompt = `Create ${numLessons} sequential, FULLY SCRIPTED lesson plans for a unit called "${unitTitle}" focused on "${topic}".
${additionalContext ? `Additional instructions: ${additionalContext}` : ""}

Each lesson should be 50 minutes with EXACTLY 3 learning objectives and AT LEAST 4 activities. For EVERY activity, write it as if you are scripting what the teacher says and does minute-by-minute. Include:
- KEY TALKING POINTS as a bulleted list of main ideas to communicate
- BACKGROUND INFORMATION: deep content knowledge (3-5 sentences) covering scientific explanations, real-world connections, common misconceptions with corrections, and analogies
- Exact questions the teacher should ask students with anticipated responses
- Key vocabulary with definitions
- Transition phrases between activities
- At least 3 online resources per lesson (videos, readings, interactive activities) with real URLs
- AT LEAST 4 key vocabulary terms per lesson with student-friendly definitions
- AT LEAST 1 NGSS standard per lesson (this is MANDATORY — every lesson MUST have standards_json populated)

Make these detailed enough that a substitute teacher with no science background could pick them up and teach effectively.`;

    // Helper to make the AI call
    async function callAI(messages: any[]) {
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolveModel(parsedBody, "default"),
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "create_lesson_plans",
                description: "Create an array of detailed lesson plans",
                parameters: {
                  type: "object",
                  properties: {
                    lessons: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Lesson title" },
                          duration_minutes: { type: "number", description: "Lesson duration in minutes" },
                          objectives: { type: "string", description: "EXACTLY 3 specific, measurable learning objectives using Bloom's taxonomy verbs, one per line" },
                          activities: {
                            type: "array",
                            description: "AT LEAST 4 activities per lesson. Each activity MUST have detailed talking points and background info.",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string", description: "Activity name, e.g. 'Warm-up: Activating Prior Knowledge'" },
                                duration: { type: "number", description: "Duration in minutes" },
                                description: { type: "string", description: "DETAILED teacher script of 8-15 sentences. MUST include: KEY TALKING POINTS as bullet points of main ideas to communicate, BACKGROUND INFORMATION with 3-5 sentences of deep content knowledge covering scientific explanations, real-world connections, common misconceptions and corrections, and analogies. Also include specific questions to ask with anticipated student responses, and step-by-step procedures for labs/activities." },
                              },
                              required: ["name", "duration", "description"],
                            },
                          },
                          materials: { type: "string", description: "Detailed materials list with quantities" },
                          assessment: { type: "string", description: "Specific formative and summative assessment strategies with example questions, exit ticket prompts, or rubric criteria" },
                          differentiation: { type: "string", description: "Specific strategies for ELL students, IEP accommodations, gifted extensions, and struggling readers" },
                          notes: { type: "string", description: "Teacher tips, common student misconceptions, and how to address them" },
                          vocabulary_json: {
                            type: "string",
                            description: "REQUIRED. JSON string of vocabulary array with AT LEAST 4 terms. Each item has term (string) and definition (string). Example: [{\"term\":\"Photosynthesis\",\"definition\":\"The process by which green plants use sunlight...\"}]",
                          },
                          resources_json: {
                            type: "string",
                            description: "JSON string of at least 3 online resources. Each has title (string), url (string — a real working URL), and type (string — one of: video, article, activity, other). Include a mix of videos, readings, and interactive activities from reputable sources like Khan Academy, YouTube edu channels, CK-12, PhET, BrainPOP, National Geographic, NASA, Smithsonian, etc. Example: [{\"title\":\"Khan Academy: Photosynthesis\",\"url\":\"https://www.khanacademy.org/science/biology/photosynthesis-in-plants\",\"type\":\"video\"},{\"title\":\"CK-12: Plant Biology\",\"url\":\"https://www.ck12.org/biology/plant-biology/\",\"type\":\"article\"},{\"title\":\"PhET: Photosynthesis Lab\",\"url\":\"https://phet.colorado.edu/en/simulations/photosynthesis\",\"type\":\"activity\"}]",
                          },
                          standards_json: {
                            type: "string",
                            description: "REQUIRED. JSON string of NGSS standards array with AT LEAST 1 standard. Each standard has code (string like MS-LS1-1) and description (the FULL COMPLETE text of the performance expectation). EVERY lesson MUST have at least one standard. Example: [{\"code\":\"MS-LS1-1\",\"description\":\"Conduct an investigation to provide evidence that living things are made of cells...\"}]",
                          },
                          udl_engagement: { type: "string", description: "REQUIRED. Concrete UDL Engagement supports for this lesson: a hook that recruits interest, 2+ student CHOICE options (path, partner, or product), and a self-regulation/reflection cue. Write as a teacher-ready paragraph or bulleted list, 4-8 sentences." },
                          udl_representation: { type: "string", description: "REQUIRED. Concrete UDL Representation supports: at least one visual/diagram alternative, one auditory/read-aloud option, vocabulary scaffolds (e.g., student-friendly rephrase or visual cue), and a 'big idea highlight' sentence. 4-8 sentences." },
                          udl_action_expression: { type: "string", description: "REQUIRED. Concrete UDL Action & Expression supports: at least 2 distinct ways students can DEMONSTRATE learning (write, draw, verbal, build/model, demonstrate) plus a planning/checkpoint cue. 4-8 sentences." },
                          reflection_prompt: { type: "string", description: "REQUIRED. A single classroom-ready metacognitive question students answer at lesson close (e.g., 'What is one thing you understood today and one thing you still wonder about?')." },
                        },
                        required: ["title", "duration_minutes", "objectives", "activities", "materials", "assessment", "differentiation", "resources_json", "vocabulary_json", "standards_json", "udl_engagement", "udl_representation", "udl_action_expression", "reflection_prompt"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["lessons"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_lesson_plans" } },
        }),
      });
    }

    function extractJsonFromResponse(text: string): any {
      // Strip markdown code blocks
      let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      // Find JSON with "lessons" key
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) return null;
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      try {
        return JSON.parse(cleaned);
      } catch {
        // Fix common issues
        cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
        try { return JSON.parse(cleaned); } catch { return null; }
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let parsed: any = null;
    const MAX_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`AI call attempt ${attempt}/${MAX_ATTEMPTS}`);
      const response = await callAI(messages);

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const text = await response.text();
        console.error("AI error:", response.status, text);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const result = await response.json();
      const msg = result.choices?.[0]?.message;
      const finishReason = result.choices?.[0]?.finish_reason;
      console.log("AI finish_reason:", finishReason, "has tool_calls:", !!msg?.tool_calls?.length, "content length:", (msg?.content || "").length);

      const toolCall = msg?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          parsed = JSON.parse(toolCall.function.arguments);
          if (parsed?.lessons?.length > 0) break;
        } catch (e) {
          console.warn("Failed to parse tool call arguments:", e);
          // Try to extract from malformed JSON
          parsed = extractJsonFromResponse(toolCall.function.arguments);
          if (parsed?.lessons?.length > 0) break;
        }
      }

      // Fallback: try to extract from content
      const content = msg?.content || "";
      if (content.length > 0) {
        parsed = extractJsonFromResponse(content);
        if (parsed?.lessons?.length > 0) break;
      }

      console.warn(`Attempt ${attempt} failed to produce valid data. finish_reason: ${finishReason}`);
      if (attempt < MAX_ATTEMPTS) {
        // Add a nudge message for retry
        messages.push({ role: "assistant", content: content || "I need to generate the lesson plans." });
        messages.push({ role: "user", content: "Please use the create_lesson_plans tool to return the structured lesson data. This is required." });
      }
    }

    if (!parsed?.lessons?.length) {
      throw new Error("AI did not return structured lesson data after multiple attempts. Please try again.");
    }

    const lessons = parsed.lessons.map((l: any) => {
      let activities = [];
      try {
        if (typeof l.activities === "string") {
          activities = JSON.parse(l.activities);
        } else if (Array.isArray(l.activities)) {
          activities = l.activities;
        }
      } catch (e) {
        console.error("Failed to parse activities:", e, "Raw:", typeof l.activities, JSON.stringify(l.activities)?.substring(0, 200));
        activities = [];
      }
      // Ensure each activity has required fields
      activities = activities.map((a: any) => ({
        name: a.name || "Untitled Activity",
        duration: a.duration || 10,
        description: a.description || "",
      }));
      let standards = [];
      try { standards = typeof l.standards_json === "string" ? JSON.parse(l.standards_json) : (l.standards_json || []); } catch { standards = []; }
      let vocabulary = [];
      try { vocabulary = typeof l.vocabulary_json === "string" ? JSON.parse(l.vocabulary_json) : (l.vocabulary_json || []); } catch { vocabulary = []; }
      let resources = [];
      try { resources = typeof l.resources_json === "string" ? JSON.parse(l.resources_json) : (l.resources_json || []); } catch { resources = []; }
      
      console.log(`Lesson "${l.title}": ${activities.length} activities parsed`);
      return { ...l, activities, standards, vocabulary, resources };
    });

    return new Response(JSON.stringify({ lessons }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-plans error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
