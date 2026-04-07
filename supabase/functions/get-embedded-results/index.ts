import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Use service role to read activity_completions + lti_sessions
    const admin = createClient(supabaseUrl, serviceKey);

    // Get teacher's ISAT exam IDs and H5P activity IDs
    const [isatRes, h5pRes] = await Promise.all([
      admin.from("isat_exams").select("id, title").eq("user_id", userId),
      admin.from("h5p_activities").select("id, title, activity_type").eq("user_id", userId),
    ]);

    const isatMap: Record<string, string> = {};
    (isatRes.data || []).forEach((e: any) => {
      isatMap[`isat-exam-${e.id}`] = e.title;
      isatMap[e.id] = e.title;
    });
    const h5pMap: Record<string, { title: string; type: string }> = {};
    (h5pRes.data || []).forEach((a: any) => {
      h5pMap[a.id] = { title: a.title, type: a.activity_type };
    });

    const allActivityIds = [
      ...Object.keys(isatMap),
      ...Object.keys(h5pMap),
    ];

    if (allActivityIds.length === 0) {
      return new Response(
        JSON.stringify({ results: [], summary: { total: 0, uniqueStudents: 0, avgScore: 0, activityCount: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get completions for these activities
    const { data: completions, error: compErr } = await admin
      .from("activity_completions")
      .select("id, session_id, activity_id, score, max_score, completed_at")
      .in("activity_id", allActivityIds)
      .order("completed_at", { ascending: false })
      .limit(500);

    if (compErr) {
      console.error("Completions query error:", compErr);
      return new Response(JSON.stringify({ error: "Failed to fetch completions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get session IDs to look up student names
    const sessionIds = [...new Set((completions || []).map((c: any) => c.session_id))];
    let sessionsMap: Record<string, { name: string; canvasUserId: string }> = {};

    if (sessionIds.length > 0) {
      const { data: sessions } = await admin
        .from("lti_sessions")
        .select("id, canvas_user_name, canvas_user_id")
        .in("id", sessionIds);

      (sessions || []).forEach((s: any) => {
        sessionsMap[s.id] = {
          name: s.canvas_user_name || `Student ${s.canvas_user_id}`,
          canvasUserId: s.canvas_user_id,
        };
      });
    }

    // Build results
    const results = (completions || []).map((c: any) => {
      const session = sessionsMap[c.session_id];
      const activityTitle = isatMap[c.activity_id]
        || h5pMap[c.activity_id]?.title
        || c.activity_id;
      const activityType = isatMap[c.activity_id]
        ? "ISAT Exam"
        : h5pMap[c.activity_id]?.type || "Activity";

      return {
        id: c.id,
        studentName: session?.name || "Unknown Student",
        canvasUserId: session?.canvasUserId || "",
        activityId: c.activity_id,
        activityTitle,
        activityType,
        score: c.score,
        maxScore: c.max_score,
        percentage: c.max_score > 0 ? Math.round((c.score / c.max_score) * 100) : 0,
        completedAt: c.completed_at,
      };
    });

    // Summary
    const uniqueStudents = new Set(results.map((r: any) => r.canvasUserId || r.studentName)).size;
    const uniqueActivities = new Set(results.map((r: any) => r.activityId)).size;
    const avgScore = results.length > 0
      ? Math.round(results.reduce((s: number, r: any) => s + r.percentage, 0) / results.length)
      : 0;

    return new Response(
      JSON.stringify({
        results,
        summary: {
          total: results.length,
          uniqueStudents,
          avgScore,
          activityCount: uniqueActivities,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-embedded-results error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
