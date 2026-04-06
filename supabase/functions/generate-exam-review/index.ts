import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { exam_id } = await req.json();
    if (!exam_id) throw new Error("Missing exam_id");

    // Fetch exam
    const { data: exam, error: examErr } = await supabase
      .from("isat_exams")
      .select("*")
      .eq("id", exam_id)
      .single();
    if (examErr || !exam) throw new Error("Exam not found");

    const questions = exam.questions as any[];
    const questionsText = questions.map((q: any, i: number) =>
      `Q${i + 1} (${q.standard_code || "N/A"}, ${q.question_type}): ${(q.question_text || "").replace(/<[^>]*>/g, "")}\nAnswers: ${JSON.stringify(q.answers)}\nHint: ${q.hint || "N/A"}`
    ).join("\n\n");

    const prompt = `You are an expert educational content creator. Based on the following ${exam.grade_level} grade ISAT exam questions, create comprehensive review materials.

EXAM: "${exam.title}"
QUESTIONS:
${questionsText}

Generate a JSON response with these three sections:

1. "study_guide": An array of study guide sections, each with:
   - "title": Section heading (group by standard or topic)
   - "content": Rich HTML explanation of the key concepts
   - "key_points": Array of bullet-point takeaways

2. "flashcards": An array of flashcard objects, each with:
   - "term": The vocabulary term or concept name
   - "definition": Clear, student-friendly definition
   - "example": A brief real-world example (optional)

3. "review_lesson": An object with:
   - "title": Lesson title
   - "objectives": Array of learning objective strings
   - "introduction": HTML intro paragraph setting context
   - "sections": Array of {title, content (HTML)} covering each major topic
   - "summary": HTML summary paragraph
   - "practice_questions": Array of {question, answer} for self-check

Make content grade-appropriate for ${exam.grade_level} graders. Use clear, engaging language. Include at least 10 flashcards and 5 practice questions.

Return ONLY valid JSON, no markdown fences.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert educational content creator. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);

    const aiData = await res.json();
    let text = aiData.choices?.[0]?.message?.content || "";
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(text);

    // Upsert review materials
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await serviceClient
      .from("exam_review_materials")
      .select("id")
      .eq("exam_id", exam_id)
      .maybeSingle();

    if (existing) {
      await serviceClient.from("exam_review_materials").update({
        study_guide: parsed.study_guide || [],
        flashcards: parsed.flashcards || [],
        review_lesson: parsed.review_lesson || {},
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await serviceClient.from("exam_review_materials").insert({
        exam_id,
        user_id: user.id,
        study_guide: parsed.study_guide || [],
        flashcards: parsed.flashcards || [],
        review_lesson: parsed.review_lesson || {},
      });
    }

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
