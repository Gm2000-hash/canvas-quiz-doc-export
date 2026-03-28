import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      console.error("Auth error:", authErr);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return new Response(JSON.stringify({ error: "Request body is empty" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let parsedBody;
    try { parsedBody = JSON.parse(rawBody); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { activityType, sourceType, sourceId, standardCode, standardDescription } = parsedBody;

    // Fetch source content
    let sourceText = "";
    let sourceTitle = "";

    if (sourceType === "standard") {
      // Generate from a standards code/description directly
      if (!standardCode || !standardDescription) {
        return new Response(JSON.stringify({ error: 'standardCode and standardDescription are required for standard source type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      sourceTitle = standardCode;
      sourceText = `Standard: ${standardCode}\nDescription: ${standardDescription}\n\nCreate an activity that helps students demonstrate mastery of this standard. The content should directly assess or teach the concepts described in the standard.`;
    } else if (sourceType === "lesson_plan") {
      const { data } = await supabase.from("lesson_plans").select("title, objectives, activities, vocabulary, materials, notes").eq("id", sourceId).single();
      if (data) {
        sourceTitle = data.title;
        const parts = [`Lesson: ${data.title}`];
        if (data.objectives) parts.push(`Objectives: ${data.objectives}`);
        if (data.materials) parts.push(`Materials: ${data.materials}`);
        if (data.notes) parts.push(`Notes: ${data.notes}`);
        if (Array.isArray(data.activities)) {
          parts.push("Activities:\n" + data.activities.map((a: any) => `- ${a.title}: ${a.description || ""}`).join("\n"));
        }
        if (Array.isArray(data.vocabulary)) {
          parts.push("Vocabulary:\n" + data.vocabulary.map((v: any) => `- ${v.term}: ${v.definition}`).join("\n"));
        }
        sourceText = parts.join("\n\n");
      }
    } else if (sourceType === "curriculum_lesson") {
      const { data } = await supabase.from("curriculum_lessons").select("title, objectives, intro, explanation, key_terms, reading_paragraphs, reading_title").eq("id", sourceId).single();
      if (data) {
        sourceTitle = data.title;
        const parts = [`Lesson: ${data.title}`];
        if (Array.isArray(data.objectives)) parts.push("Objectives:\n" + data.objectives.map((o: any) => `- ${typeof o === 'string' ? o : o.text}`).join("\n"));
        if (Array.isArray(data.key_terms)) parts.push("Key Terms:\n" + data.key_terms.map((t: any) => `- ${t.term}: ${t.definition}`).join("\n"));
        if (Array.isArray(data.intro)) parts.push("Introduction:\n" + data.intro.map((p: any) => typeof p === 'string' ? p : p.text).join("\n"));
        if (Array.isArray(data.explanation)) parts.push("Explanation:\n" + data.explanation.map((p: any) => typeof p === 'string' ? p : p.text).join("\n"));
        if (data.reading_title) parts.push(`Reading: ${data.reading_title}`);
        if (Array.isArray(data.reading_paragraphs)) parts.push("Reading Content:\n" + data.reading_paragraphs.join("\n\n"));
        sourceText = parts.join("\n\n");
      }
    }

    if (!sourceText) {
      return new Response(JSON.stringify({ error: 'Could not find source content' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build type-specific instructions
    const typeInstructions: Record<string, string> = {
      fill_in_blanks: `Generate a "Fill in the Blanks" activity. Return JSON: { "text": "...", "acceptAlternatives": true }. Use *asterisks* around blank words. Create 5-8 blanks covering key concepts from the lesson content.`,
      drag_the_words: `Generate a "Drag the Words" activity. Return JSON: { "text": "...", "showInstantFeedback": true }. Use *asterisks* around draggable words. Create 5-8 drag targets from key vocabulary/concepts.`,
      multiple_choice: `Generate a "Multiple Choice" activity. Return JSON: { "question": "...", "options": [{"id":"uuid","text":"...","correct":true/false},...], "multiAnswer": false }. Create a question with 4 options based on the lesson. Use crypto.randomUUID()-style strings for ids.`,
      true_false: `Generate a "True/False" activity. Return JSON: { "statement": "...", "correctAnswer": true/false, "feedback": "..." }. Create a factual statement from the lesson content.`,
      single_choice_set: `Generate a "Single Choice Set" activity. Return JSON: { "questions": [{"id":"uuid","question":"...","options":["A","B","C","D"],"correctIndex":0},...] }. Create 5 questions from the lesson content.`,
      mark_the_words: `Generate a "Mark the Words" activity. Return JSON: { "text": "..." }. Write a paragraph based on the lesson with key terms wrapped in *asterisks* that students must identify. Include 5-8 marked words.`,
      essay: `Generate an "Essay" activity. Return JSON: { "question": "...", "keywords": [{"text":"...","caseSensitive":false},...], "maxWords": 300 }. Create a thought-provoking essay prompt with 5-8 keywords students should include.`,
      summary: `Generate a "Summary" activity. Return JSON: { "intro": "Select the correct statement in each group.", "groups": [{"id":"uuid","statements":["correct","wrong1","wrong2"],"correctIndex":0},...] }. Create 4 groups of statements.`,
      dialog_cards: `Generate "Dialog Cards" for vocabulary review. Return JSON: { "cards": [{"id":"uuid","front":"term","back":"definition"},...] }. Create 6-10 cards from the lesson's key terms and concepts.`,
      flashcards: `Generate "Flashcards" for review. Return JSON: { "cards": [{"id":"uuid","term":"...","definition":"..."},...] }. Create 8-12 flashcards from the lesson content.`,
      memory_game: `Generate a "Memory Game" with matching pairs. Return JSON: { "pairs": [{"id":"uuid","cardA":"term","cardB":"definition"},...] }. Create 6-8 pairs from the lesson's key concepts.`,
      accordion: `Generate an "Accordion" content activity. Return JSON: { "panels": [{"id":"uuid","title":"...","content":"..."},...] }. Create 4-6 panels that organize the lesson content into expandable sections.`,
      timeline: `Generate a "Timeline" activity. Return JSON: { "headline": "...", "events": [{"id":"uuid","date":"...","title":"...","description":"..."},...] }. Create 5-8 events that represent the key concepts or processes in chronological/logical order.`,
      crossword: `Generate a "Crossword" activity. Return JSON: { "title": "...", "words": [{"id":"uuid","word":"TERM","clue":"definition...","direction":"across"|"down"},...] }. Create 6-10 words from lesson vocabulary. Use uppercase for words. Alternate across/down directions.`,
      drag_and_drop: `Generate a "Drag and Drop" activity. Return JSON: { "items": [{"id":"uuid","label":"..."},...], "zones": [{"id":"uuid","label":"...","correctItemIds":["item-id"]},...] }. Create 4-6 items and 2-3 zones for categorization based on the lesson.`,
      question_set: `Generate a "Question Set" activity. Return JSON: { "questions": [{"id":"uuid","type":"multiple_choice","content":{"question":"...","options":[{"id":"uuid","text":"...","correct":true/false}],"multiAnswer":false}},...], "passPercentage": 70 }. Create 5 multiple choice questions.`,
      course_presentation: `Generate a "Course Presentation". Return JSON: { "slides": [{"id":"uuid","title":"...","content":"...","notes":""},...] }. Create 5-8 slides that present the lesson content in a structured format.`,
      interactive_book: `Generate an "Interactive Book". Return JSON: { "title": "...", "chapters": [{"id":"uuid","title":"...","content":"..."},...] }. Create 3-5 chapters that organize the lesson content.`,
      column: `Generate a "Column" layout. Return JSON: { "sections": [{"id":"uuid","title":"...","content":"..."},...] }. Create 4-6 sections that present the lesson content vertically.`,
      personality_quiz: `Generate a "Personality Quiz". Return JSON: { "profiles": [{"id":"uuid","name":"Type Name","description":"..."},...], "questions": [{"id":"uuid","question":"...","options":[{"text":"...","profileScores":{"profile-id":1}},...]},...] }. Create 3-4 profiles related to learning styles or approaches to the topic, and 5-6 questions that map to those profiles.`,
      game_map: `Generate a "Game Map" activity. Return JSON: { "title":"...", "stages": [{"id":"uuid","label":"Stage Name","x":percentage,"y":percentage,"type":"multiple_choice","content":{"question":"...","options":[{"id":"uuid","text":"...","correct":true/false}],"multiAnswer":false}},...] }. Create 4-6 stages positioned across the map (x/y as 10-90 percentages), each with a multiple choice question from the lesson content.`,
      arithmetic_quiz: `Generate an "Arithmetic Quiz" config. Return JSON: { "operations": ["add","subtract","multiply","divide"], "maxNumber": 50, "questionCount": 10, "timeLimit": 120 }. Choose operations and difficulty appropriate to the lesson content.`,
      documentation_tool: `Generate a "Documentation Tool". Return JSON: { "title":"...", "fields": [{"id":"uuid","label":"...","type":"text"|"textarea"|"number","required":true/false},...] }. Create 5-8 fields that guide students through documenting their understanding of the lesson.`,
      image_hotspots: `Generate an "Image Hotspots" activity. Return JSON: { "imageUrl":"", "hotspots": [{"id":"uuid","x":percentage,"y":percentage,"title":"...","content":"..."},...] }. Create 4-6 hotspots with informational content from the lesson. Use x/y as 10-90 percentages. Leave imageUrl empty.`,
      interactive_video: `Generate an "Interactive Video" activity. Return JSON: { "videoUrl":"", "interactions": [{"id":"uuid","timestamp":seconds,"type":"label"|"question","content":"..."},...] }. Create 4-6 interactions at different timestamps with questions/labels from the lesson. Leave videoUrl empty.`,
      virtual_tour: `Generate a "Virtual Tour" activity. Return JSON: { "title":"...", "scenes": [{"id":"uuid","title":"...","description":"..."},...] }. Create 4-6 scenes that walk through different aspects of the lesson content.`,
      agamotto: `Generate an "Agamotto" (Image Blender) activity. Return JSON: { "images": [{"id":"uuid","imageUrl":"","label":"...","description":"..."},...] }. Create 4-6 image entries with labels and descriptions that represent stages or comparisons from the lesson. Leave imageUrl empty.`,
    };

    const instruction = typeInstructions[activityType] || `Generate an activity of type "${activityType}" based on the lesson content. Return valid JSON matching the expected schema for this activity type.`;

    const systemPrompt = `You are an expert educational content creator specializing in interactive H5P activities. You create engaging, pedagogically sound activities based on lesson content provided to you.

RULES:
- Generate content that directly uses the vocabulary, concepts, and facts from the source material
- Make activities age-appropriate and educational
- Return ONLY valid JSON — no markdown, no code fences, no extra text
- Use unique UUID-style strings for all id fields (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
- Ensure all correct answers are factually accurate based on the source material`;

    const userPrompt = `Source Material:
${sourceText}

Task: ${instruction}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    rawContent = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let generatedContent;
    try {
      generatedContent = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(JSON.stringify({ error: "AI returned invalid JSON. Please try again." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ content: generatedContent, sourceTitle }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("generate-h5p-activity error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
