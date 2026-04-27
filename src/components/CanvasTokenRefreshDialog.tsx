import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  REFRESH_REQUEST_EVENT,
  rejectTokenRefresh,
  resolveTokenRefresh,
  type RefreshRequestDetail,
} from '@/lib/canvas-token-refresh';
import type { CanvasConfig } from '@/lib/canvas-api';
import { toast } from 'sonner';

/**
 * Validates a candidate Canvas token by calling the proxy directly.
 * Bypasses canvasRequest() to avoid recursing into the refresh flow.
 */
async function validateToken(cfg: CanvasConfig): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return 'Please sign in again before reconnecting Canvas.';

    const { data, error } = await supabase.functions.invoke('canvas-proxy', {
      body: { action: 'get_courses', canvasUrl: cfg.canvasUrl, apiToken: cfg.apiToken },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (error) {
      try {
        const ctx: any = (error as any).context;
        if (ctx?.json) {
          const body = await ctx.json();
          return body?.error || body?.message || error.message || 'Token validation failed.';
        }
      } catch { /* ignore */ }
      return error.message || 'Token validation failed.';
    }
    if (data?.error) return data.error;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Token validation failed.';
  }
}

export function CanvasTokenRefreshDialog() {
  const [open, setOpen] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent<RefreshRequestDetail>).detail;
      setCanvasUrl(detail?.currentConfig?.canvasUrl || '');
      setApiToken('');
      setOpen(true);
    };
    window.addEventListener(REFRESH_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(REFRESH_REQUEST_EVENT, onRequest);
  }, []);

  const handleSubmit = async () => {
    const url = canvasUrl.trim().replace(/\/+$/, '');
    const token = apiToken.trim();
    if (!url || !token) {
      toast.error('Both Canvas URL and token are required.');
      return;
    }
    setSubmitting(true);
    const errMsg = await validateToken({ canvasUrl: url, apiToken: token });
    setSubmitting(false);
    if (errMsg) {
      toast.error(errMsg);
      return;
    }
    const newConfig: CanvasConfig = { canvasUrl: url, apiToken: token };
    resolveTokenRefresh(newConfig);
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
            Your stored Canvas token was rejected. Paste a new one and we'll resume your export — your selected quiz and settings are preserved.
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
