import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, canvasUrl, apiToken, courseId, quizId } = await req.json();

    if (!canvasUrl || !apiToken) {
      return new Response(JSON.stringify({ error: 'Canvas URL and API token are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = canvasUrl.replace(/\/+$/, '');
    const headers = { 'Authorization': `Bearer ${apiToken}` };

    let url: string;

    switch (action) {
      case 'get_courses':
        url = `${baseUrl}/api/v1/courses?per_page=100&enrollment_state=active`;
        break;
      case 'get_quizzes':
        if (!courseId) throw new Error('courseId is required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes?per_page=100`;
        break;
      case 'get_quiz_questions':
        if (!courseId || !quizId) throw new Error('courseId and quizId are required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/questions?per_page=100`;
        break;
      case 'get_quiz':
        if (!courseId || !quizId) throw new Error('courseId and quizId are required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Canvas API error [${response.status}]: ${errorText}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
