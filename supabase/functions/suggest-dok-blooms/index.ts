import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

serve(withLogging("suggest-dok-blooms", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { userId, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    console.log("Authenticated suggest-dok-blooms request from", userId);
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
    const { question_text, question_type, current_dok, current_blooms, answers } = parsedBody;

    if (!question_text?.trim()) {
      return new Response(JSON.stringify({ error: "question_text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build answer context for the AI
    let answerContext = "";
    let answerJsonExample = "";
    if (answers) {
      if (Array.isArray(answers)) {
        // MC / Select-All / True-False / Matching
        const formatted = answers.map((a: any, i: number) => {
          if (a.left !== undefined) return `  ${i + 1}. "${a.left}" → "${a.right}"`;
          const marker = a.weight > 0 ? " ✓" : "";
          return `  ${i + 1}. "${a.text}"${marker}`;
        }).join("\n");
        answerContext = `\nCurrent Answer Choices:\n${formatted}`;
        answerJsonExample = `\nCurrent answers JSON (you MUST return rewritten_answers in this EXACT same JSON array format):\n${JSON.stringify(answers)}`;
      } else if (answers.parts) {
        answerContext = `\nCurrent Multi-Step Parts: ${JSON.stringify(answers.parts)}`;
        answerJsonExample = `\nCurrent answers JSON (return rewritten_answers in this EXACT same format):\n${JSON.stringify(answers)}`;
      } else if (answers.categories) {
        answerContext = `\nCurrent Drag & Drop Categories: ${JSON.stringify(answers.categories)}`;
        answerJsonExample = `\nCurrent answers JSON (return rewritten_answers in this EXACT same format):\n${JSON.stringify(answers)}`;
      } else if (answers.passage) {
        answerContext = `\nCurrent Passage: "${answers.passage}"`;
        answerJsonExample = `\nCurrent answers JSON (return rewritten_answers in this EXACT same format):\n${JSON.stringify(answers)}`;
      }
    }

    const hasAnswers = !!(answerContext && answerJsonExample);

    const systemPrompt = `You are an expert science education consultant specializing in Depth of Knowledge (DOK) and Bloom's Taxonomy alignment for middle school science assessments.

Given a question, provide specific, actionable suggestions for how to modify or rewrite it to target each DOK level (1-4) and each Bloom's level (Remember, Understand, Apply, Analyze, Evaluate, Create).

For each level, provide:
1. A brief explanation of what changes are needed
2. A concrete rewritten version of the question at that level
${hasAnswers ? "3. Rewritten answer choices that match the rewritten question. Keep the same format (number of choices, correct/incorrect marking) but update the text to align with the new question." : ""}

Keep the same science content/topic but adjust cognitive demand. Be specific and practical — these suggestions should be directly usable by a teacher.

Focus on levels that differ from the current level. For the current level, just confirm it's appropriate.`;

    const userPrompt = `Here is the question to analyze:

Question Type: ${question_type || "multiple_choice_question"}
Question Text: ${question_text}
Current DOK Level: ${current_dok || "Not set"}
Current Bloom's Level: ${current_blooms || "Not set"}${answerContext}

Provide customization suggestions for ALL DOK levels (1-4) and ALL Bloom's levels (Remember, Understand, Apply, Analyze, Evaluate, Create).${hasAnswers ? "\n\nIMPORTANT: For each rewritten question, also provide rewritten_answers that match. Keep the same JSON structure as the current answers but update the text content to fit the rewritten question." : ""}`;

    const answersProperty = hasAnswers
      ? { rewritten_answers: { type: "object" as const, description: "Rewritten answer choices matching the rewritten question. Same JSON structure as original answers." } }
      : {};

    const answersRequired = hasAnswers ? ["rewritten_answers"] : [];

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
              name: "provide_suggestions",
              description: "Return DOK and Bloom's level customization suggestions for a question.",
              parameters: {
                type: "object",
                properties: {
                  dok_suggestions: {
                    type: "array",
                    description: "Suggestions for each DOK level 1-4",
                    items: {
                      type: "object",
                      properties: {
                        level: { type: "number", description: "DOK level (1-4)" },
                        level_name: { type: "string", description: "e.g. Recall & Reproduction" },
                        explanation: { type: "string", description: "Brief explanation of what changes are needed" },
                        rewritten_question: { type: "string", description: "The question rewritten at this DOK level" },
                        is_current: { type: "boolean", description: "Whether this matches the current level" },
                        ...answersProperty,
                      },
                      required: ["level", "level_name", "explanation", "rewritten_question", "is_current", ...answersRequired],
                    },
                  },
                  blooms_suggestions: {
                    type: "array",
                    description: "Suggestions for each Bloom's level",
                    items: {
                      type: "object",
                      properties: {
                        level: { type: "string", description: "Bloom's level name" },
                        explanation: { type: "string", description: "Brief explanation of what changes are needed" },
                        rewritten_question: { type: "string", description: "The question rewritten at this Bloom's level" },
                        is_current: { type: "boolean", description: "Whether this matches the current level" },
                        ...answersProperty,
                      },
                      required: ["level", "explanation", "rewritten_question", "is_current", ...answersRequired],
                    },
                  },
                },
                required: ["dok_suggestions", "blooms_suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No suggestions returned from AI");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-dok-blooms error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
