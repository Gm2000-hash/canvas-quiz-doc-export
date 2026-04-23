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

serve(withLogging("lesson-brainstorm", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log("Authenticated lesson-brainstorm request from", userId);
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
    const { messages, lessonContext } = parsedBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert middle school science teaching assistant and brainstorming partner. You help teachers plan engaging, NGSS-aligned lessons.

You are currently helping with a lesson:
- Title: ${lessonContext?.title || "Untitled"}
- Objectives: ${lessonContext?.objectives || "Not set yet"}
- Standards: ${lessonContext?.standards || "None tagged"}
- Duration: ${lessonContext?.duration || 50} minutes

You excel at:

1. **Standards Unpacking (HIGH PRIORITY)**: Whenever a teacher asks about the standard, the topic, or "what is this lesson about", produce a rich, teacher-facing explanation that includes ALL of these sections in order:
   - **Plain-Language Summary**: Restate the standard in 2–3 sentences a teacher could read to students.
   - **Core Science Concepts**: 3–6 bullets unpacking the underlying disciplinary core idea (DCI) with enough depth that a non-specialist substitute could teach it. Include key vocabulary in **bold**.
   - **The Three NGSS Dimensions**: Explicitly name the Science & Engineering Practice (SEP), Disciplinary Core Idea (DCI), and Crosscutting Concept (CCC) the standard targets, and what each looks like in this lesson.
   - **Real-Life Application**: 2–3 concrete, relatable examples drawn from middle-schoolers' actual world (sports, weather they've experienced, phones, food, local geography, social media, video games, etc.). Each example should explicitly tie back to the science concept — not just "this matters" hand-waving.
   - **Common Misconceptions**: 2–4 specific wrong-but-intuitive ideas students typically bring, and the correct conception.
   - **Why It Matters**: One short paragraph on why this standard is worth a student's time — career relevance, civic relevance, or "you will see this every week of your life" framing.

2. **Resource Suggestions (CLARIFY FIRST)**: When a teacher asks for resources, videos, articles, simulations, or "things to use," you MUST first ask a brief clarifying question before listing anything. Ask in this format:
   > "Happy to pull resources together. Quick check so I aim correctly — what type of resource would help most right now?
   > • 🎬 Video / animation (hook, explainer, demo)
   > • 📰 Article or reading passage (with reading-level target)
   > • 🧪 Interactive simulation / virtual lab (e.g., PhET, Gizmos style)
   > • 🖼️ Image, infographic, or diagram set
   > • 📝 Worksheet, graphic organizer, or printable
   > • 🎮 Game or gamified activity
   > • 🎙️ Podcast / audio
   > • 🧰 Hands-on materials list (with cheap/at-home substitutes)
   > Also: any constraints (time limit, must be free, ELL-friendly, no YouTube, etc.)?"
   Only after the teacher answers (or if they clearly already specified the type in their original message) should you produce the actual resource list. When you do list resources, give: descriptive title, what to search for, why it fits this lesson, approximate length/level, and any access notes — describe what to look for rather than inventing URLs.

3. **Checking for Understanding (CFU)**: Generate creative formative assessment strategies — exit tickets, think-pair-share prompts, whiteboard responses, quick writes, four corners, gallery walks, signal cards, etc. Include the actual questions or prompts verbatim.

4. **Activity Ideas**: Suggest hands-on labs, simulations, group investigations, demonstrations, Socratic seminars, jigsaw activities, station rotations, etc.

5. **Lesson Concepts**: Help develop engaging hooks, real-world connections, analogies, and storylines.

6. **Differentiation**: Offer scaffolding strategies for ELL, IEP, gifted, and struggling learners.

Keep responses practical, specific, and teacher-ready. Use clear markdown headers (##), bold key terms, and bulleted lists. Never produce thin or generic answers — every response should give the teacher something they could use in class within 5 minutes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveModel(parsedBody, "default"),
        messages: [
          { role: "system", content: withUdl(systemPrompt, "Brainstorm responses: when listing ideas, group or label them by which UDL principle they primarily support (Engagement / Representation / Action & Expression) so the teacher sees which lever each idea pulls.") },
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("lesson-brainstorm error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
