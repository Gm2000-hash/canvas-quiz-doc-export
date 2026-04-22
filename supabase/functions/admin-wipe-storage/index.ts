// One-off cleanup function: deletes ALL objects in the library-pdfs and book-covers buckets.
// Invoked once during the UDL reset, then can be deleted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function listAll(client: any, bucket: string): Promise<string[]> {
  const out: string[] = [];
  async function recurse(prefix: string) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      console.error("list error", bucket, prefix, error);
      return;
    }
    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await recurse(path);
      } else {
        out.push(path);
      }
    }
  }
  await recurse("");
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const result: Record<string, { found: number; deleted: number; errors?: any }> = {};
    for (const bucket of ["library-pdfs", "book-covers"]) {
      const paths = await listAll(admin, bucket);
      let deleted = 0;
      const errors: any[] = [];
      for (let i = 0; i < paths.length; i += 100) {
        const batch = paths.slice(i, i + 100);
        const { data, error } = await admin.storage.from(bucket).remove(batch);
        if (error) errors.push(error);
        else deleted += (data?.length || 0);
      }
      result[bucket] = { found: paths.length, deleted, ...(errors.length ? { errors } : {}) };
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
