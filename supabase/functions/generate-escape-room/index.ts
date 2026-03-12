import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, topic, gradeLevel, discipline, objectives, vocabulary, numPuzzles, difficulty, additionalContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert middle school science teacher who creates immersive, richly detailed digital escape rooms that students complete via Google Forms. You design multi-step puzzles that test content knowledge while being fun, challenging, and deeply engaging.

CRITICAL — DETAIL AND LENGTH REQUIREMENTS:
- Each room/puzzle MUST be EXTENSIVE and DETAILED — at minimum half a page of content when printed
- narrative_text must be 5-10 sentences of vivid, immersive storytelling that sets the scene (describe the environment, what students see/hear/smell, the tension of the scenario)
- question_text must be MULTI-STEP: include background information, a data table or scenario description, then 2-3 sub-questions or steps that build on each other before arriving at the lock code
- Do NOT write short, single-sentence puzzles. Each puzzle should feel like a mini-adventure with real depth
- Include specific scientific details, numbers, data, and context — not vague generalities

ESCAPE ROOM DESIGN PRINCIPLES:
- Each puzzle/room should test a specific concept or skill from the lesson content
- Use a narrative theme that connects all puzzles (e.g., "save the lab," "escape the volcano," "decode the alien message")
- Puzzles should progress from easier to harder
- Each puzzle has a "lock code" — the correct answer that unlocks the next section
- Design for Google Forms: each puzzle is a separate section, with the correct answer serving as response validation
- Include red herrings and distractors that require critical thinking
- Mix question types: multiple choice, short answer codes, ordering/sequencing, image-based clues

MULTI-STEP PUZZLE STRUCTURE (REQUIRED for each room):
- Step 1: Present a rich scenario with specific data, observations, or evidence
- Step 2: Ask students to analyze, interpret, or apply a concept to the scenario
- Step 3: Use the result from Step 2 to solve a final calculation, decode, or reasoning challenge that produces the lock code
- Include supplementary details like lab notebook entries, field observations, data tables (described in text), or intercepted messages

PUZZLE TYPES TO USE:
1. Decode puzzles — students solve a multi-part science problem through several calculation steps, the final answer is a code
2. Matching/ordering — arrange steps of a process in order, first letters spell a word; include detailed descriptions of each step
3. Diagram analysis — describe in vivid detail an image/diagram students must analyze, provide specific measurements or labels, ask multi-part questions
4. Vocabulary cipher — provide rich context paragraphs where definitions lead to terms, certain letters form the code
5. Data interpretation — present a detailed data table or graph description with multiple data points, ask students to identify patterns and extract the answer
6. Riddle/clue chains — multi-clue science riddles where students must solve each clue sequentially to build the final answer

For Google Forms implementation:
- Each puzzle = one Form section
- The "lock code" answer should be validated using Form response validation
- Include clear instructions for the teacher on how to set up the Google Form
- Provide the exact text for each Form section, question, and validation rule`;

    const userPrompt = `Create a ${numPuzzles}-puzzle digital escape room for ${gradeLevel || "middle school"} ${discipline || "science"} students.

Topic: "${topic || title}"
${objectives ? `Learning Objectives: ${objectives}` : ""}
${vocabulary ? `Key Vocabulary to incorporate: ${vocabulary}` : ""}
Difficulty: ${difficulty || "medium"}
${additionalContext ? `Additional instructions: ${additionalContext}` : ""}

IMPORTANT: Each room must be EXTENSIVE and RICHLY DETAILED. The narrative_text should be 5-10 sentences of vivid scene-setting. The question_text should be MULTI-STEP with background information, data/evidence, and 2-3 progressive steps that lead to the lock code. Each room should fill at least half a page when printed. Do NOT create short or shallow puzzles.

Design an engaging narrative theme and create puzzles that test deep understanding of the content. Each puzzle should have clear Google Form setup instructions.`;

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
              name: "create_escape_room",
              description: "Create a complete digital escape room with puzzles designed for Google Forms",
              parameters: {
                type: "object",
                properties: {
                  theme_title: { type: "string", description: "Creative title for the escape room (e.g., 'Escape the Mutant Lab!')" },
                  narrative_intro: { type: "string", description: "The story/scenario that sets up the escape room. 3-5 sentences that hook students and explain the mission." },
                  google_form_setup: { type: "string", description: "Step-by-step instructions for the teacher on how to create this escape room in Google Forms, including how to use section navigation and response validation." },
                  puzzles_json: {
                    type: "string",
                    description: "JSON string of puzzles array. Each puzzle has: room_number (number), room_name (string — creative name like 'The Specimen Chamber'), narrative_text (string — story text students see that sets up the puzzle, 2-4 sentences), puzzle_type (string — one of: decode, matching, diagram, vocabulary, data, riddle), question_text (string — the actual question/puzzle students must solve, detailed enough to stand alone), hints (array of strings — 2-3 progressive hints), lock_code (string — the correct answer that unlocks the next room), lock_code_explanation (string — why this is the answer, for teacher reference), form_section_instructions (string — exact instructions for setting up this puzzle in Google Forms including response validation settings), distractors (array of strings — 3-4 wrong answer options for multiple choice puzzles). Example: [{\"room_number\":1,\"room_name\":\"The Specimen Chamber\",\"narrative_text\":\"You enter the lab and find a locked cabinet...\",\"puzzle_type\":\"decode\",\"question_text\":\"The specimen label reads...\",\"hints\":[\"Think about cell division...\",\"Count the chromosomes...\"],\"lock_code\":\"23\",\"lock_code_explanation\":\"Meiosis halves the chromosome number from 46 to 23\",\"form_section_instructions\":\"Create a new section titled 'Room 1: The Specimen Chamber'. Add the narrative text as a description. Add a short answer question with response validation: Number - Equal to - 23. Set 'Go to section based on answer' to advance to Section 2 on correct answer.\",\"distractors\":[\"46\",\"92\",\"12\"]}]",
                  },
                  answer_key_summary: { type: "string", description: "A quick-reference answer key listing all room codes in order, formatted for the teacher" },
                  estimated_time_minutes: { type: "number", description: "Estimated time for students to complete the escape room" },
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
