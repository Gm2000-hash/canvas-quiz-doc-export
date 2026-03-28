import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log("Authenticated generate-escape-room request from", userId);
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
    const { title, topic, gradeLevel, discipline, objectives, vocabulary, numPuzzles, difficulty, additionalContext } = parsedBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert middle school science teacher and master storyteller who creates immersive, richly detailed digital escape rooms. You write like a novelist — every room is a vivid scene with sensory details, tension, and discovery.

ABSOLUTE REQUIREMENTS FOR EVERY ROOM:
1. NARRATIVE (narrative_text): Write 8-12 sentences of immersive second-person storytelling. Describe what students see, hear, smell, and feel. Build tension and curiosity. Include specific environmental details (flickering monitors, bubbling beakers, strange symbols on walls, etc.). Each room's narrative must continue the overarching story — reference what happened in previous rooms and hint at what's ahead.

2. SCENARIO (scenario_text): Write a detailed scientific scenario that provides the context for the puzzle. This should be 6-10 sentences and include:
   - A specific scientific situation (lab experiment results, field observations, data from instruments)
   - Concrete data: numbers, measurements, species names, chemical formulas, dates
   - A "found document" feel — like reading a scientist's lab notebook, a field report, a decoded transmission, or an equipment readout
   
3. CHALLENGE (challenge_steps): Provide exactly 3 steps that students must work through. Each step should be:
   - Step 1: An observation or analysis task (2-4 sentences explaining what to examine and what to figure out)
   - Step 2: An application or reasoning task that builds on Step 1 (2-4 sentences)
   - Step 3: A final synthesis that combines Steps 1 and 2 to produce the lock code (2-4 sentences)

4. STORY CONTINUITY: Each room must advance the overarching plot. Include a story_transition that bridges this room to the next (2-3 sentences of what happens after solving this puzzle — a door opens, a message appears, a new clue is revealed).

PUZZLE TYPES TO USE (vary across rooms):
1. Decode — multi-step calculation where each step produces a digit of the code
2. Matching/Ordering — arrange items in sequence, combine first letters or specific elements
3. Diagram Analysis — describe a detailed diagram with labels, measurements; students must read and interpret it
4. Vocabulary Cipher — rich context paragraphs with key terms; specific letters from terms form the code
5. Data Interpretation — present a full data table (rows and columns described in text) with patterns to find
6. Riddle Chain — sequential science riddles where each answer feeds into the next

For Google Forms: each puzzle = one Form section with response validation on the lock code.`;

    const userPrompt = `Create a ${numPuzzles}-puzzle digital escape room for ${gradeLevel || "middle school"} ${discipline || "science"} students.

Topic: "${topic || title}"
${objectives ? `Learning Objectives: ${objectives}` : ""}
${vocabulary ? `Key Vocabulary to incorporate: ${vocabulary}` : ""}
Difficulty: ${difficulty || "medium"}
${additionalContext ? `Additional instructions: ${additionalContext}` : ""}

CRITICAL INSTRUCTIONS:
- Write LONG, DETAILED content for every field. Each room should be substantial enough to fill at least half a printed page.
- narrative_text: 8-12 sentences of vivid storytelling with sensory details
- scenario_text: 6-10 sentences of specific scientific context with real data/numbers
- challenge_steps: 3 multi-sentence steps that build on each other
- story_transition: 2-3 sentences connecting to the next room
- Create a continuous storyline where each room advances the plot
- DO NOT write short, generic content. Be specific, creative, and detailed.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_escape_room",
              description: "Create a complete, richly detailed digital escape room",
              parameters: {
                type: "object",
                properties: {
                  theme_title: { type: "string", description: "Creative, evocative title" },
                  narrative_intro: { type: "string", description: "8-12 sentences of immersive scene-setting that hooks students into the story. Describe the setting, the stakes, and their mission in vivid detail." },
                  google_form_setup: { type: "string", description: "Detailed step-by-step teacher instructions for Google Forms setup" },
                  puzzles_json: {
                    type: "string",
                    description: "A JSON-encoded array of puzzle objects. Each object MUST have ALL of these fields: room_number (number), room_name (string, creative name), narrative_text (string, 8-12 sentences of vivid second-person storytelling continuing the story), scenario_text (string, 6-10 sentences of specific scientific context with data/numbers/measurements — like a lab notebook entry or field report), challenge_steps (array of exactly 3 strings, each 2-4 sentences describing a progressive step students must complete), puzzle_type (string: decode/matching/diagram/vocabulary/data/riddle), lock_code (string), lock_code_explanation (string, detailed multi-step solution walkthrough), story_transition (string, 2-3 sentences bridging to the next room), hints (array of 3-4 progressive hint strings), form_section_instructions (string), distractors (array of 3-4 wrong answers). WRITE EXTENSIVELY — narrative_text alone should be 150+ words, scenario_text should be 100+ words.",
                  },
                  answer_key_summary: { type: "string", description: "Formatted answer key with all codes and brief explanations" },
                  estimated_time_minutes: { type: "number", description: "Estimated completion time" },
                },
                required: ["theme_title", "narrative_intro", "google_form_setup", "puzzles_json", "answer_key_summary", "estimated_time_minutes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_escape_room" } },
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

    let puzzles = [];
    try {
      puzzles = typeof parsed.puzzles_json === "string" ? JSON.parse(parsed.puzzles_json) : (parsed.puzzles_json || []);
    } catch { puzzles = []; }

    return new Response(JSON.stringify({
      theme_title: parsed.theme_title,
      narrative_intro: parsed.narrative_intro,
      google_form_setup: parsed.google_form_setup,
      puzzles,
      answer_key_summary: parsed.answer_key_summary,
      estimated_time_minutes: parsed.estimated_time_minutes,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-escape-room error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
