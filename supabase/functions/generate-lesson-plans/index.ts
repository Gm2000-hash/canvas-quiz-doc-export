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
- OBJECTIVES: Write 3-5 specific, measurable learning objectives using Bloom's taxonomy verbs. Include the FULL TEXT of each aligned NGSS performance expectation (not just the code).
- ACTIVITIES: Script out each activity in detail. For direct instruction, include the key talking points, questions to ask, and example explanations the teacher should give. For labs/investigations, include step-by-step procedures. For discussions, include specific discussion prompts and expected student responses. For group work, include specific tasks and roles. Each activity description should be 3-8 sentences minimum — think of it as a teacher script.
- MATERIALS: List every specific material with quantities (e.g., "30 copies of Cell Diagram handout", "1 microscope per lab group of 4").
- ASSESSMENT: Describe specific formative and summative assessment strategies with example questions or rubric criteria.
- DIFFERENTIATION: Provide specific accommodations for ELL students, students with IEPs, gifted learners, and struggling readers.
- NOTES: Include teacher tips, common misconceptions students may have, and how to address them.

Include a variety of activities: direct instruction, labs, group work, discussions, and assessments.
Map each lesson to relevant NGSS Middle School performance expectations (MS-LS, MS-PS, MS-ESS, MS-ETS codes). Always include the COMPLETE standard text.`;

    const userPrompt = `Create ${numLessons} sequential, FULLY SCRIPTED lesson plans for a unit called "${unitTitle}" focused on "${topic}".
${additionalContext ? `Additional instructions: ${additionalContext}` : ""}

Each lesson should be 50 minutes. For EVERY activity, write it as if you are scripting what the teacher says and does minute-by-minute. Include:
- Exact questions the teacher should ask students
- Key vocabulary with definitions
- Transition phrases between activities
- Anticipated student questions and how to respond
- Specific examples and analogies to use when explaining concepts

Make these detailed enough that a substitute teacher could pick them up and teach effectively.`;

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
                        objectives: { type: "string", description: "Learning objectives, one per line" },
                        activities: {
                          type: "string",
                          description: "JSON string of activities array. Each activity has name (string), duration (number in minutes), and description (string). Example: [{\"name\":\"Warm-up\",\"duration\":5,\"description\":\"Review...\"}]",
                        },
                        materials: { type: "string", description: "Materials and resources needed, one per line" },
                        assessment: { type: "string", description: "Assessment strategies" },
                        differentiation: { type: "string", description: "Differentiation strategies for diverse learners" },
                        notes: { type: "string", description: "Additional teacher notes" },
                        standards_json: {
                          type: "string",
                          description: "JSON string of NGSS standards array. Each standard has code (string like MS-LS1-1) and description (string). Example: [{\"code\":\"MS-LS1-1\",\"description\":\"Conduct an investigation...\"}]",
                        },
                      },
                      required: ["title", "duration_minutes", "objectives", "activities", "materials", "assessment", "differentiation"],
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Parse stringified JSON fields
    const lessons = parsed.lessons.map((l: any) => {
      let activities = [];
      try { activities = typeof l.activities === "string" ? JSON.parse(l.activities) : l.activities; } catch { activities = []; }
      let standards = [];
      try { standards = typeof l.standards_json === "string" ? JSON.parse(l.standards_json) : (l.standards_json || []); } catch { standards = []; }
      return { ...l, activities, standards };
    });

    return new Response(JSON.stringify({ lessons }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-plans error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
