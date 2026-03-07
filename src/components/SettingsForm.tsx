import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCourses, type CanvasConfig } from '@/lib/canvas-api';
import { toast } from 'sonner';
import { Settings, CheckCircle, Loader2, ExternalLink } from 'lucide-react';

interface SettingsFormProps {
  config: CanvasConfig | null;
  onSave: (config: CanvasConfig) => void;
  onDisconnect: () => void;
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

    let url = canvasUrl.trim();
    if (!url.startsWith('http')) url = `https://${url}`;

    setTesting(true);
    try {
      await getCourses({ canvasUrl: url, apiToken: apiToken.trim() });
      onSave({ canvasUrl: url, apiToken: apiToken.trim() });
      toast.success('Connected to Canvas successfully!');
    } catch (err) {
      toast.error('Failed to connect. Please check your URL and API token.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Canvas LMS Settings
        </CardTitle>
        <CardDescription>
          Connect to your Canvas instance to export quizzes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Connected to Canvas</span>
            </div>
            <p className="text-sm text-muted-foreground">{config.canvasUrl}</p>
            <Button variant="outline" onClick={onDisconnect}>Disconnect</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="canvasUrl">Canvas URL</Label>
              <Input
                id="canvasUrl"
                placeholder="e.g. canvas.myschool.edu"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Your school's Canvas domain</p>
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
                Go to Canvas → Account → Settings → New Access Token.{' '}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
