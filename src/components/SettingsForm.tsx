import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCourses, type CanvasConfig } from '@/lib/canvas-api';
import { toast } from 'sonner';
import { CheckCircle, Loader2, ExternalLink } from 'lucide-react';

interface SettingsFormProps {
  config: CanvasConfig | null;
  onSave: (config: CanvasConfig) => void;
  onDisconnect: () => void;
}

const APPROVED_CANVAS_HOST_PATTERNS = [
  /(^|\.)instructure\.com$/i,
  /(^|\.)canvaslms\.com$/i,
  /^canvas\./i,
  /\.canvas\./i,
];

function isIpAddress(hostname: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function isApprovedCanvasHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (normalized === 'localhost' || normalized.endsWith('.local') || isIpAddress(normalized)) {
    return false;
  }

  return APPROVED_CANVAS_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeCanvasUrl(value: string) {
  const raw = value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`;
  const url = new URL(raw);

  if (url.protocol !== 'https:') {
    throw new Error('Canvas URL must use HTTPS.');
  }

  if (!isApprovedCanvasHost(url.hostname)) {
    throw new Error('Use an approved Canvas domain, such as your school Canvas URL or an instructure.com address.');
  }

  return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`.replace(/\/+$/, '');
}

export function SettingsForm({ config, onSave, onDisconnect }: SettingsFormProps) {
  const [canvasUrl, setCanvasUrl] = useState(config?.canvasUrl || '');
  const [apiToken, setApiToken] = useState(config?.apiToken || '');
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!canvasUrl || !apiToken) {
      toast.error('Please fill in both fields');
      return;
    }

    setTesting(true);
    try {
      const url = normalizeCanvasUrl(canvasUrl);
      await getCourses({ canvasUrl: url, apiToken: apiToken.trim() });
      onSave({ canvasUrl: url, apiToken: apiToken.trim() });
      toast.success('Connected to Canvas successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect. Please check your URL and API token.');
    } finally {
      setTesting(false);
    }
  };

  if (config) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Connected to Canvas</span>
        </div>
        <p className="text-sm text-muted-foreground">{config.canvasUrl}</p>
        <Button variant="outline" onClick={onDisconnect} size="sm">Disconnect</Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Canvas LMS Settings</CardTitle>
        <CardDescription>Enter your Canvas instance URL and API token.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="canvasUrl">Canvas URL</Label>
          <Input
            id="canvasUrl"
            placeholder="e.g. canvas.myschool.edu"
            value={canvasUrl}
            onChange={(e) => setCanvasUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiToken">API Access Token</Label>
          <Input
            id="apiToken"
            type="password"
            placeholder="Paste your Canvas API token"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Canvas → Account → Settings → New Access Token.{' '}
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
        <Button onClick={handleTest} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            'Connect to Canvas'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
