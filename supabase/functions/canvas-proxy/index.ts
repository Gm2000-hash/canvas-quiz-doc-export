import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APPROVED_CANVAS_HOST_PATTERNS = [
  /(^|\.)instructure\.com$/i,
  /(^|\.)canvaslms\.com$/i,
  /^canvas\./i,
  /\.canvas\./i,
];

function isIpAddress(hostname: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function validateCanvasUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid Canvas URL');
  }

  const hostname = url.hostname.toLowerCase();
  const isApprovedHost = APPROVED_CANVAS_HOST_PATTERNS.some((pattern) => pattern.test(hostname));

  if (url.protocol !== 'https:') {
    throw new Error('Canvas URL must use HTTPS');
  }

  if (hostname === 'localhost' || hostname.endsWith('.local') || isIpAddress(hostname)) {
    throw new Error('Canvas URL must use an approved Canvas domain');
  }

  if (!isApprovedHost) {
    throw new Error('Canvas URL must use an approved Canvas domain');
  }

  return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`.replace(/\/+$/, '');
}

async function requireAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authError = await requireAuth(req);
    if (authError) return authError;

    const { action, canvasUrl, apiToken, courseId, quizId, quizData, questionData, submissionId } = await req.json();

    if (!canvasUrl || !apiToken) {
      return new Response(JSON.stringify({ error: 'Canvas URL and API token are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = validateCanvasUrl(canvasUrl);
    const headers: Record<string, string> = { 'Authorization': `Bearer ${apiToken}` };

    let url: string;
    let method = 'GET';
    let body: string | undefined;

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
      case 'create_quiz':
        if (!courseId || !quizData) throw new Error('courseId and quizData are required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes`;
        method = 'POST';
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ quiz: quizData });
        break;
      case 'create_quiz_question':
        if (!courseId || !quizId || !questionData) throw new Error('courseId, quizId, and questionData are required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/questions`;
        method = 'POST';
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ question: questionData });
        break;
      case 'get_quiz_submissions':
        if (!courseId || !quizId) throw new Error('courseId and quizId are required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/submissions?per_page=100`;
        break;
      case 'get_quiz_submission_events':
        if (!courseId || !quizId || !submissionId) throw new Error('courseId, quizId, and submissionId are required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/submissions/${submissionId}/events`;
        break;
      case 'get_quiz_statistics':
        if (!courseId || !quizId) throw new Error('courseId and quizId are required');
        url = `${baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/statistics`;
        break;
      case 'get_quiz_report': {
        if (!courseId || !quizId) throw new Error('courseId and quizId are required');
        // Create a student_analysis report, then fetch the CSV
        // Step 1: Request report generation
        const createUrl = `${baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/reports`;
        headers['Content-Type'] = 'application/json';
        const createResp = await fetch(createUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ quiz_report: { report_type: 'student_analysis' } }),
        });
        
        if (!createResp.ok) {
          // Report might already exist, try to get it
          const listResp = await fetch(`${createUrl}?per_page=10`, { headers: { 'Authorization': `Bearer ${apiToken}` } });
          if (!listResp.ok) {
            const errorText = await listResp.text();
            return new Response(JSON.stringify({ error: `Canvas API error [${listResp.status}]: ${errorText}` }), {
              status: listResp.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const reports = await listResp.json();
          const studentReport = reports.find((r: any) => r.report_type === 'student_analysis');
          if (studentReport?.file?.url) {
            const csvResp = await fetch(studentReport.file.url);
            const csvText = await csvResp.text();
            return new Response(JSON.stringify({ csv: csvText, report: studentReport }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ reports, pending: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const report = await createResp.json();
        
        // Step 2: Poll for completion (up to 30 seconds)
        let attempts = 0;
        let currentReport = report;
        while (!currentReport.file?.url && attempts < 10) {
          await new Promise(r => setTimeout(r, 3000));
          const checkResp = await fetch(`${createUrl}/${currentReport.id}`, { headers: { 'Authorization': `Bearer ${apiToken}` } });
          if (checkResp.ok) {
            currentReport = await checkResp.json();
          }
          attempts++;
        }
        
        if (currentReport.file?.url) {
          const csvResp = await fetch(currentReport.file.url);
          const csvText = await csvResp.text();
          return new Response(JSON.stringify({ csv: csvText, report: currentReport }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ report: currentReport, pending: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      case 'get_enrollments':
        if (!courseId) throw new Error('courseId is required');
        url = `${baseUrl}/api/v1/courses/${courseId}/enrollments?type[]=StudentEnrollment&per_page=100&state[]=active`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // For get_quiz_report, we already returned above
    const response = await fetch(url!, { method, headers, body });

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
    const status = /Unauthorized|Invalid Canvas URL|Canvas URL must use|required/.test(message) ? 400 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
