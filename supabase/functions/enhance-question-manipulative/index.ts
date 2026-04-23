import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  prompt: string;
  question_text: string;
  question_type?: string;
  standard_code?: string;
  standard_description?: string;
  format: "diagram" | "drag_and_drop" | "image_hotspots";
  rewrite?: boolean;
  current_dok?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json() as Body;
    const { prompt, question_text, question_type, standard_code, format, rewrite, current_dok } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["diagram", "drag_and_drop", "image_hotspots"].includes(format)) {
      return new Response(JSON.stringify({ error: "invalid format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Step 1: Generate the diagram image ──
    const labelHint = format === "drag_and_drop"
      ? "\n\nIMPORTANT: Render the diagram with NUMBERED arrows or blank label boxes pointing at 3-6 distinct parts. Leave the labels blank — students will drag the correct terms onto each numbered position."
      : format === "image_hotspots"
        ? "\n\nIMPORTANT: Render a clean diagram with 3-6 visually distinct parts that could each be clicked. Do not include labels — students will identify each part by clicking it."
        : "\n\nInclude clear labels and arrows where appropriate.";

    const fullPrompt = `Create a clean, educational diagram for a middle school science assessment question. ${prompt}

Context: ${question_type || "science"} question — "${String(question_text).slice(0, 300)}"

Requirements:
- Clean diagram style suitable for a test
- White or very light background
- Scientifically accurate
- No question text in the image${labelHint}`;

    const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!imgResp.ok) {
      if (imgResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (imgResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await imgResp.text();
      console.error("Image gen error:", imgResp.status, t.slice(0, 300));
      throw new Error("Failed to generate image");
    }

    const imgData = await imgResp.json();
    const imageDataUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageDataUrl) throw new Error("No image returned");

    // Upload image to storage
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `${user.id}/enhance-${Date.now()}.png`;
    const { error: uploadError } = await adminSupabase.storage
      .from("activity-media")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error("Upload failed: " + uploadError.message);

    const { data: { publicUrl } } = adminSupabase.storage.from("activity-media").getPublicUrl(fileName);

    // ── Step 2: Generate H5P content + (optional) rewritten question ──
    let activity_id: string | undefined;
    let activity_type: string | undefined;
    let suggested_question_text: string | undefined;
    let suggested_answers: any;
    let suggested_dok: number | undefined;

    if (format === "diagram") {
      // No H5P needed — just attach the image
      if (rewrite) {
        const rewriteResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: `You rewrite middle-school NGSS test questions to make explicit use of an attached diagram, raising the DOK by one level (max 4). Reference "the diagram" naturally in the stem. Keep the same answer count. Output strict JSON: {"question_text": "...", "answers": [...], "dok_level": N}. Preserve the answers array shape exactly as given.` },
              { role: "user", content: `Original question: "${question_text}"\nOriginal DOK: ${current_dok ?? 2}\nDiagram description: "${prompt}"\nStandard: ${standard_code || ""}\n\nRewrite to require analyzing the diagram. Output JSON only.` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (rewriteResp.ok) {
          const r = await rewriteResp.json();
          try {
            const parsed = JSON.parse(r.choices?.[0]?.message?.content || "{}");
            suggested_question_text = parsed.question_text;
            suggested_answers = parsed.answers;
            suggested_dok = Math.min(4, parsed.dok_level || ((current_dok ?? 2) + 1));
          } catch (e) { console.warn("rewrite parse failed", e); }
        }
      }
    } else {
      // ── Generate H5P content (drag_and_drop or image_hotspots) ──
      const isDnD = format === "drag_and_drop";
      const h5pSystem = isDnD
        ? `You design middle-school science manipulatives. Given a diagram description, output the labels students must drag onto the diagram. Output strict JSON: {"items":[{"id":"i1","label":"..."}],"zones":[{"id":"z1","label":"position 1 (top-left arrow)","correctItemIds":["i1"]}]}. Provide 3-6 items matching 3-6 zones, one item per zone.`
        : `You design middle-school science image hotspots. Given a diagram description, output 3-6 hotspots with approximate %-coordinates on the image (0-100) and a short title + content for each. Output strict JSON: {"hotspots":[{"id":"h1","x":50,"y":40,"title":"Nucleus","content":"Controls the cell..."}]}.`;

      const h5pResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: h5pSystem },
            { role: "user", content: `Question: "${question_text}"\nDiagram: "${prompt}"\nStandard: ${standard_code || ""}\n\nOutput JSON only.` },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!h5pResp.ok) throw new Error("Failed to generate manipulative content");
      const h5pData = await h5pResp.json();
      let parsed: any;
      try {
        parsed = JSON.parse(h5pData.choices?.[0]?.message?.content || "{}");
      } catch {
        parsed = isDnD ? { items: [], zones: [] } : { hotspots: [] };
      }

      // Build content payload
      let content: any;
      if (isDnD) {
        content = {
          items: Array.isArray(parsed.items) ? parsed.items : [],
          zones: Array.isArray(parsed.zones) ? parsed.zones : [],
        };
        activity_type = "drag_and_drop";
      } else {
        content = {
          imageUrl: publicUrl,
          hotspots: Array.isArray(parsed.hotspots) ? parsed.hotspots : [],
        };
        activity_type = "image_hotspots";
      }

      // Insert h5p_activities row
      const { data: actRow, error: actError } = await adminSupabase
        .from("h5p_activities")
        .insert({
          user_id: user.id,
          title: `Enhanced: ${String(question_text).slice(0, 60)}`,
          activity_type,
          content,
        })
        .select("id")
        .single();
      if (actError) throw new Error("Failed to save activity: " + actError.message);
      activity_id = actRow.id;

      // Optional rewrite
      if (rewrite) {
        const rewriteResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: `You rewrite middle-school NGSS test questions to make explicit use of an attached interactive ${isDnD ? "drag-and-drop labeling" : "clickable hotspot"} diagram, raising the DOK by one level (max 4). Reference "the diagram below" or "the labeled image" naturally. Keep the same answer count. Output strict JSON: {"question_text": "...", "answers": [...], "dok_level": N}.` },
              { role: "user", content: `Original question: "${question_text}"\nOriginal DOK: ${current_dok ?? 2}\nDiagram: "${prompt}"\n\nRewrite. Output JSON only.` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (rewriteResp.ok) {
          const r = await rewriteResp.json();
          try {
            const parsed = JSON.parse(r.choices?.[0]?.message?.content || "{}");
            suggested_question_text = parsed.question_text;
            suggested_answers = parsed.answers;
            suggested_dok = Math.min(4, parsed.dok_level || ((current_dok ?? 2) + 1));
          } catch (e) { console.warn("rewrite parse failed", e); }
        }
      }
    }

    return new Response(JSON.stringify({
      image_url: publicUrl,
      activity_id,
      activity_type,
      suggested_question_text,
      suggested_answers,
      suggested_dok,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("enhance-question-manipulative error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
