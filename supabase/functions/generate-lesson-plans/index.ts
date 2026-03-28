import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

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

    const systemPrompt = `You are an expert middle school science teacher creating FULLY SCRIPTED, classroom-ready lesson plans aligned to NGSS.
You must return structured lesson plans using the provided tool.
Each lesson should be practical, engaging, and age-appropriate for ${gradeLevel || "middle school"} students.
Focus on ${discipline || "science"} content.

CRITICAL REQUIREMENTS FOR DETAIL:
- OBJECTIVES: Write EXACTLY 3 specific, measurable learning objectives using Bloom's taxonomy verbs. No more than 3. Include the FULL TEXT of each aligned NGSS performance expectation (not just the code).
- ACTIVITIES: Include AT LEAST 4 distinct activities per lesson (e.g., warm-up, direct instruction, guided practice, lab/investigation, group work, discussion, assessment, closing). For EVERY activity, provide:
  1. KEY TALKING POINTS: A bulleted list of the main ideas the teacher should communicate, written as if scripting what to say.
  2. BACKGROUND INFORMATION: 3-5 sentences of deep content knowledge the teacher needs to understand and convey — include scientific explanations, real-world connections, common misconceptions and how to correct them, and relevant analogies.
  3. STUDENT ENGAGEMENT: Specific questions to ask, anticipated student responses, and follow-up probes.
  4. STEP-BY-STEP PROCEDURE: For labs/investigations, include numbered steps. For discussions, include prompts. For group work, include tasks and roles.
  Each activity description should be 8-15 sentences minimum — think of it as a comprehensive teacher script with embedded content knowledge.
- MATERIALS: List every specific material with quantities (e.g., "30 copies of Cell Diagram handout", "1 microscope per lab group of 4").
- ASSESSMENT: Describe specific formative and summative assessment strategies with example questions or rubric criteria.
- DIFFERENTIATION: Provide specific accommodations for ELL students, students with IEPs, gifted learners, and struggling readers.
- NOTES: Include teacher tips, common misconceptions students may have, and how to address them.
- RESOURCES: For EVERY lesson, provide at least 3 real, reputable online resources with working URLs. Include a mix of videos (YouTube, Khan Academy, etc.), articles (National Geographic, NASA, Smithsonian, CK-12, etc.), and interactive activities (PhET simulations, BrainPOP, etc.). These should be real URLs that teachers can actually use.
- VOCABULARY: For EVERY lesson, include AT LEAST 4 key science vocabulary terms with clear, student-friendly definitions. These are critical terms students must understand. Include more terms for vocabulary-heavy lessons.
- NGSS STANDARDS: For EVERY lesson, you MUST tag it with at least one relevant NGSS Middle School performance expectation (MS-LS, MS-PS, MS-ESS, MS-ETS codes). Include the COMPLETE standard text. This is MANDATORY — no lesson should be returned without at least one NGSS standard.

Include a variety of activities: direct instruction, labs, group work, discussions, and assessments.`;

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
          model: "google/gemini-2.5-flash",
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
                        },
                        required: ["title", "duration_minutes", "objectives", "activities", "materials", "assessment", "differentiation", "resources_json", "vocabulary_json", "standards_json"],
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
