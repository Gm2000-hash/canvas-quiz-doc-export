import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, ExternalLink, Check, X, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  REFRESH_REQUEST_EVENT,
  rejectTokenRefresh,
  resolveTokenRefresh,
  type RefreshRequestDetail,
  type RefreshScope,
} from '@/lib/canvas-token-refresh';
import type { CanvasConfig } from '@/lib/canvas-api';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'running' | 'ok' | 'fail';
interface ValidationStep {
  key: string;
  label: string;
  status: StepStatus;
  error?: string;
}

/**
 * Calls the canvas-proxy directly (bypassing canvasRequest's refresh loop)
 * and returns either an error string or null on success.
 */
async function callProxy(
  cfg: CanvasConfig,
  action: string,
  extra: Record<string, unknown> = {},
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return { ok: false, error: 'Please sign in again before reconnecting Canvas.' };

    const { data, error } = await supabase.functions.invoke('canvas-proxy', {
      body: { ...extra, action, canvasUrl: cfg.canvasUrl, apiToken: cfg.apiToken },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (error) {
      let msg = error.message || 'Request failed.';
      try {
        const ctx: any = (error as any).context;
        if (ctx?.json) {
          const body = await ctx.json();
          msg = body?.error || body?.message || msg;
        }
      } catch { /* ignore */ }
      return { ok: false, error: msg };
    }
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed.' };
  }
}

/** Build the validation plan from the original request scope. */
function planForScope(scope: RefreshScope | null): ValidationStep[] {
  const plan: ValidationStep[] = [
    { key: 'auth', label: 'Authenticate with Canvas', status: 'pending' },
  ];
  if (scope?.courseId) {
    plan.push({ key: 'course', label: `Access course #${scope.courseId}`, status: 'pending' });
  }
  if (scope?.courseId && scope?.quizId) {
    plan.push({ key: 'quiz', label: `Access quiz #${scope.quizId}`, status: 'pending' });
  }
  return plan;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'ok') return <Check className="h-4 w-4 text-success" />;
  if (status === 'fail') return <X className="h-4 w-4 text-destructive" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

export function CanvasTokenRefreshDialog() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<RefreshScope | null>(null);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState<ValidationStep[]>([]);

  useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent<RefreshRequestDetail>).detail;
      setCanvasUrl(detail?.currentConfig?.canvasUrl || '');
      setApiToken('');
      setScope(detail?.scope || null);
      setSteps(planForScope(detail?.scope || null));
      setOpen(true);
    };
    window.addEventListener(REFRESH_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(REFRESH_REQUEST_EVENT, onRequest);
  }, []);

  const updateStep = (key: string, patch: Partial<ValidationStep>) => {
    setSteps(prev => prev.map(s => (s.key === key ? { ...s, ...patch } : s)));
  };

  /**
   * Runs steps sequentially. Returns true if every step passed.
   * Stops at the first failure and surfaces the error on that step.
   */
  const runValidation = async (cfg: CanvasConfig): Promise<boolean> => {
    // 1. Authenticate (lightweight — list courses)
    updateStep('auth', { status: 'running', error: undefined });
    const authRes = await callProxy(cfg, 'get_courses');
    if (!authRes.ok) {
      updateStep('auth', { status: 'fail', error: authRes.error });
      return false;
    }
    updateStep('auth', { status: 'ok' });

    // 2. Course access (only if scoped)
    if (scope?.courseId) {
      updateStep('course', { status: 'running', error: undefined });
      const courseRes = await callProxy(cfg, 'get_quizzes', { courseId: scope.courseId });
      if (!courseRes.ok) {
        updateStep('course', {
          status: 'fail',
          error: `${courseRes.error} — your new token may not have access to this course.`,
        });
        return false;
      }
      updateStep('course', { status: 'ok' });
    }

    // 3. Quiz access (only if scoped)
    if (scope?.courseId && scope?.quizId) {
      updateStep('quiz', { status: 'running', error: undefined });
      const quizRes = await callProxy(cfg, 'get_quiz', {
        courseId: scope.courseId,
        quizId: scope.quizId,
      });
      if (!quizRes.ok) {
        updateStep('quiz', {
          status: 'fail',
          error: `${quizRes.error} — the new token can't read this quiz.`,
        });
        return false;
      }
      updateStep('quiz', { status: 'ok' });
    }

    return true;
  };

  const handleSubmit = async () => {
    const url = canvasUrl.trim().replace(/\/+$/, '');
    const token = apiToken.trim();
    if (!url || !token) {
      toast.error('Both Canvas URL and token are required.');
      return;
    }
    setSubmitting(true);
    // Reset step states for a fresh run
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as StepStatus, error: undefined })));

    const cfg: CanvasConfig = { canvasUrl: url, apiToken: token };
    const passed = await runValidation(cfg);
    setSubmitting(false);

    if (!passed) {
      toast.error('Token validation failed. See details above.');
      return;
    }

    resolveTokenRefresh(cfg);
    setOpen(false);
    toast.success('Canvas reconnected. Resuming where you left off…');
  };

  const handleCancel = () => {
    rejectTokenRefresh('You cancelled the Canvas reconnect.');
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Canvas token expired
          </DialogTitle>
          <DialogDescription>
            Your stored Canvas token was rejected. Paste a new one — we'll verify it can access your selected course and quiz before resuming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="refresh-canvas-url">Canvas URL</Label>
            <Input
              id="refresh-canvas-url"
              value={canvasUrl}
              onChange={(e) => setCanvasUrl(e.target.value)}
              placeholder="https://canvas.myschool.edu"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refresh-canvas-token">New API token</Label>
            <Input
              id="refresh-canvas-token"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Paste your new Canvas access token"
              disabled={submitting}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitting) handleSubmit();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Canvas → Account → Settings → New Access Token{' '}
              <a
                href="https://community.canvaslms.com/t5/Admin-Guide/How-do-I-manage-API-access-tokens-as-an-admin/ta-p/89"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Learn more <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {steps.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Validation checks
              </p>
              <ul className="space-y-1.5">
                {steps.map(step => (
                  <li key={step.key} className="text-sm">
                    <div className="flex items-center gap-2">
                      <StepIcon status={step.status} />
                      <span
                        className={
                          step.status === 'fail'
                            ? 'text-destructive'
                            : step.status === 'ok'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {step.label}
                      </span>
                    </div>
                    {step.error && (
                      <p className="ml-6 mt-0.5 text-xs text-destructive break-words">{step.error}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating…
              </>
            ) : (
              'Reconnect & resume'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
