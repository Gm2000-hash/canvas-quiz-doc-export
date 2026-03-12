import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { unitTitle, discipline, gradeLevel, topic, numLessons, additionalContext } = await req.json();
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

Include a variety of activities: direct instruction, labs, group work, discussions, and assessments.
Map each lesson to relevant NGSS Middle School performance expectations (MS-LS, MS-PS, MS-ESS, MS-ETS codes). Always include the COMPLETE standard text.`;

    const userPrompt = `Create ${numLessons} sequential, FULLY SCRIPTED lesson plans for a unit called "${unitTitle}" focused on "${topic}".
${additionalContext ? `Additional instructions: ${additionalContext}` : ""}

Each lesson should be 50 minutes with EXACTLY 3 learning objectives and AT LEAST 4 activities. For EVERY activity, write it as if you are scripting what the teacher says and does minute-by-minute. Include:
- KEY TALKING POINTS as a bulleted list of main ideas to communicate
- BACKGROUND INFORMATION: deep content knowledge (3-5 sentences) covering scientific explanations, real-world connections, common misconceptions with corrections, and analogies
- Exact questions the teacher should ask students with anticipated responses
- Key vocabulary with definitions
- Transition phrases between activities
- At least 3 online resources per lesson (videos, readings, interactive activities) with real URLs

Make these detailed enough that a substitute teacher with no science background could pick them up and teach effectively.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
                          type: "string",
                          description: "JSON string of AT LEAST 4 activities. Each activity has name (string), duration (number in minutes), and description (string — this MUST be 8-15 sentences including: KEY TALKING POINTS as bullet points, BACKGROUND INFORMATION with 3-5 sentences of deep content knowledge covering scientific explanations/real-world connections/misconceptions/analogies, specific questions to ask with anticipated responses, and step-by-step procedures). Example: [{\"name\":\"Warm-up: Activating Prior Knowledge\",\"duration\":5,\"description\":\"KEY TALKING POINTS:\\n• Energy cannot be created or destroyed...\\n\\nBACKGROUND INFORMATION: Energy transfer is a fundamental concept...\\n\\nAsk students: What happens when you rub your hands together?\"}]",
                        },
                        materials: { type: "string", description: "Detailed materials list with quantities" },
                        assessment: { type: "string", description: "Specific formative and summative assessment strategies with example questions, exit ticket prompts, or rubric criteria" },
                        differentiation: { type: "string", description: "Specific strategies for ELL students, IEP accommodations, gifted extensions, and struggling readers" },
                        notes: { type: "string", description: "Teacher tips, common student misconceptions, and how to address them" },
                        vocabulary_json: {
                          type: "string",
                          description: "JSON string of vocabulary array. Each item has term (string) and definition (string). Include 5-10 key science vocabulary terms. Example: [{\"term\":\"Photosynthesis\",\"definition\":\"The process by which green plants use sunlight...\"}]",
                        },
                        resources_json: {
                          type: "string",
                          description: "JSON string of at least 3 online resources. Each has title (string), url (string — a real working URL), and type (string — one of: video, article, activity, other). Include a mix of videos, readings, and interactive activities from reputable sources like Khan Academy, YouTube edu channels, CK-12, PhET, BrainPOP, National Geographic, NASA, Smithsonian, etc. Example: [{\"title\":\"Khan Academy: Photosynthesis\",\"url\":\"https://www.khanacademy.org/science/biology/photosynthesis-in-plants\",\"type\":\"video\"},{\"title\":\"CK-12: Plant Biology\",\"url\":\"https://www.ck12.org/biology/plant-biology/\",\"type\":\"article\"},{\"title\":\"PhET: Photosynthesis Lab\",\"url\":\"https://phet.colorado.edu/en/simulations/photosynthesis\",\"type\":\"activity\"}]",
                        },
                        standards_json: {
                          type: "string",
                          description: "JSON string of NGSS standards array. Each standard has code (string like MS-LS1-1) and description (the FULL COMPLETE text of the performance expectation). Example: [{\"code\":\"MS-LS1-1\",\"description\":\"Conduct an investigation to provide evidence that living things are made of cells...\"}]",
                        },
                      },
                      required: ["title", "duration_minutes", "objectives", "activities", "materials", "assessment", "differentiation", "resources_json"],
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
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);

    const lessons = parsed.lessons.map((l: any) => {
      let activities = [];
      try { activities = typeof l.activities === "string" ? JSON.parse(l.activities) : l.activities; } catch { activities = []; }
      let standards = [];
      try { standards = typeof l.standards_json === "string" ? JSON.parse(l.standards_json) : (l.standards_json || []); } catch { standards = []; }
      let vocabulary = [];
      try { vocabulary = typeof l.vocabulary_json === "string" ? JSON.parse(l.vocabulary_json) : (l.vocabulary_json || []); } catch { vocabulary = []; }
      let resources = [];
      try { resources = typeof l.resources_json === "string" ? JSON.parse(l.resources_json) : (l.resources_json || []); } catch { resources = []; }
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
});
