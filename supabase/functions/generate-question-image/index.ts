import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const { prompt, question_text, question_type, mode, standard_code, standard_description } = body;

    // ── Mode: suggest_prompt — return a draft image prompt only, no image generation ──
    if (mode === "suggest_prompt") {
      if (!question_text || typeof question_text !== "string") {
        return new Response(JSON.stringify({ error: "question_text is required for suggest_prompt mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const suggestSystem = `You are a science assessment illustrator. Given a middle-school NGSS test question, draft a SHORT (2-4 sentence) image prompt for an educational diagram that would meaningfully enhance the question — not just decorate it. The diagram should give students a visual data source they can analyze, not restate what the question already says in words. Focus on labeled scientific diagrams, data tables, models, or process illustrations. Avoid cartoons, decoration, or stock photo styles.`;
      const suggestUser = `Question: "${String(question_text).slice(0, 800)}"
Question type: ${question_type || "multiple choice"}
${standard_code ? `Standard: ${standard_code}${standard_description ? ` — ${standard_description}` : ""}` : ""}

Write the image prompt now (just the prompt, no preamble).`;

      const sResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: suggestSystem },
            { role: "user", content: suggestUser },
          ],
        }),
      });

      if (!sResp.ok) {
        if (sResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (sResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("Failed to suggest prompt");
      }

      const sData = await sResp.json();
      const suggested = sData.choices?.[0]?.message?.content?.trim() || "";
      return new Response(JSON.stringify({ suggested_prompt: suggested }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "prompt is required and must be under 2000 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextHint = question_text
      ? `\n\nContext: This image accompanies a ${question_type || "science"} question: "${question_text.slice(0, 300)}"`
      : "";

    const fullPrompt = `Create a clear, educational diagram or illustration for a middle school science assessment question. ${prompt}${contextHint}

Requirements:
- Clean, labeled diagram style suitable for a test/quiz
- No decorative elements — focus on scientific accuracy
- White or very light background
- Include labels and arrows where appropriate
- No question text in the image — just the visual`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error("AI API error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to generate image");
    }

    const data = await response.json();
    const imageDataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl) {
      throw new Error("No image returned from AI");
    }

    // Upload base64 image to storage
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `${user.id}/question-${Date.now()}.png`;

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: uploadError } = await adminSupabase.storage
      .from("activity-media")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image");
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from("activity-media")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ image_url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-question-image error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
