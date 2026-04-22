import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'canvas_config';

export function CanvasTokenRescue() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasToken = () => {
      try {
        return !!localStorage.getItem(STORAGE_KEY);
      } catch {
        return false;
      }
    };

    const trigger = () => {
      if (hasToken()) setShow(true);
    };

    const onInvalid = () => trigger();

    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason || '');
      if (msg.includes('Canvas API error [401]') || msg.includes('Invalid access token')) {
        trigger();
      }
    };

    const onError = (e: ErrorEvent) => {
      const msg = String(e.message || '');
      if (msg.includes('Canvas API error [401]') || msg.includes('Invalid access token')) {
        trigger();
      }
    };

    window.addEventListener('canvas-token-invalid', onInvalid);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);

    return () => {
      window.removeEventListener('canvas-token-invalid', onInvalid);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  if (!show) return null;

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-sm rounded-2xl border border-card-foreground/20 bg-card/95 backdrop-blur-md p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-2 flex-1">
          <p className="text-sm font-semibold">Canvas token invalid</p>
          <p className="text-xs text-muted-foreground">
            Your stored Canvas API token was rejected. Clear it and reconnect.
          </p>
          <Button size="sm" onClick={handleClear} className="w-full">
            Clear &amp; reload
          </Button>
        </div>
      </div>
    </div>
  );
}
