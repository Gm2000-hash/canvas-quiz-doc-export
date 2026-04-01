import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Copy, ExternalLink, Shield } from "lucide-react";

interface LtiPlatform {
  id: string;
  name: string;
  issuer: string;
  client_id: string;
  auth_login_url: string;
  auth_token_url: string;
  jwks_url: string;
  deployment_id: string | null;
  created_at: string;
}

export default function LtiSettings() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<LtiPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("Canvas");
  const [issuer, setIssuer] = useState("");
  const [clientId, setClientId] = useState("");
  const [authLoginUrl, setAuthLoginUrl] = useState("");
  const [authTokenUrl, setAuthTokenUrl] = useState("");
  const [jwksUrl, setJwksUrl] = useState("");
  const [deploymentId, setDeploymentId] = useState("");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const toolJwksUrl = `${supabaseUrl}/functions/v1/lti-jwks`;
  const toolLoginUrl = `${supabaseUrl}/functions/v1/lti-login`;
  const toolLaunchUrl = `${supabaseUrl}/functions/v1/lti-launch`;

  useEffect(() => {
    if (user) fetchPlatforms();
  }, [user]);

  const fetchPlatforms = async () => {
    const { data } = await supabase
      .from("lti_platforms")
      .select("*")
      .order("created_at", { ascending: false });
    setPlatforms((data as LtiPlatform[]) ?? []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!user || !issuer.trim() || !clientId.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("lti_platforms").insert({
      user_id: user.id,
      name: name.trim(),
      issuer: issuer.trim(),
      client_id: clientId.trim(),
      auth_login_url: authLoginUrl.trim(),
      auth_token_url: authTokenUrl.trim(),
      jwks_url: jwksUrl.trim(),
      deployment_id: deploymentId.trim() || null,
    });

    if (error) {
      toast.error("Failed to save platform registration");
    } else {
      toast.success("LTI platform registered!");
      setShowAdd(false);
      resetForm();
      fetchPlatforms();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("lti_platforms").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete platform");
    } else {
      setPlatforms(prev => prev.filter(p => p.id !== id));
      toast.success("Platform removed");
    }
  };

  const resetForm = () => {
    setName("Canvas");
    setIssuer("");
    setClientId("");
    setAuthLoginUrl("");
    setAuthTokenUrl("");
    setJwksUrl("");
    setDeploymentId("");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const autoFillCanvas = () => {
    if (!issuer.trim()) return;
    const base = issuer.trim().replace(/\/+$/, "");
    setAuthLoginUrl(`${base}/api/lti/authorize_redirect`);
    setAuthTokenUrl(`${base}/login/oauth2/token`);
    setJwksUrl(`${base}/api/lti/security/jwks`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          LTI 1.3 Integration
        </CardTitle>
        <CardDescription>
          Register your Canvas instance for automatic grade passback when students complete activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tool Configuration URLs */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
          <h4 className="text-sm font-semibold">Your Tool Configuration (use in Canvas Developer Key setup)</h4>
          <div className="space-y-2">
            {[
              { label: "JWKS URL", value: toolJwksUrl },
              { label: "Login Initiation URL", value: toolLoginUrl },
              { label: "Redirect URI (Launch URL)", value: toolLaunchUrl },
              { label: "Target Link URI", value: "https://canvas-quiz-doc-export.lovable.app/activities/{activity_id}/play" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-40 shrink-0">{item.label}:</span>
                <code className="text-xs bg-background px-2 py-1 rounded border border-border flex-1 truncate">
                  {item.value}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(item.value, item.label)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Registered Platforms */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : platforms.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Registered Platforms</h4>
            {platforms.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.issuer}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">Client: {p.client_id}</Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Add Platform Form */}
        {showAdd ? (
          <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <h4 className="text-sm font-semibold">Register Canvas Instance</h4>

            <div className="space-y-2">
              <Label>Platform Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="My School Canvas" />
            </div>

            <div className="space-y-2">
              <Label>Issuer URL (Canvas base URL)</Label>
              <div className="flex gap-2">
                <Input
                  value={issuer}
                  onChange={e => setIssuer(e.target.value)}
                  placeholder="https://myschool.instructure.com"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={autoFillCanvas}>Auto-fill</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Enter your Canvas URL, then click Auto-fill to populate the rest</p>
            </div>

            <div className="space-y-2">
              <Label>Client ID (from Canvas Developer Key)</Label>
              <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="10000000000001" />
            </div>

            <div className="space-y-2">
              <Label>Auth Login URL</Label>
              <Input value={authLoginUrl} onChange={e => setAuthLoginUrl(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Auth Token URL</Label>
              <Input value={authTokenUrl} onChange={e => setAuthTokenUrl(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Platform JWKS URL</Label>
              <Input value={jwksUrl} onChange={e => setJwksUrl(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Deployment ID (optional)</Label>
              <Input value={deploymentId} onChange={e => setDeploymentId(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={saving || !issuer.trim() || !clientId.trim()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Register Platform
              </Button>
              <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Register Canvas Instance
          </Button>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
          <p className="font-medium">Setup Steps:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>In Canvas, go to Admin → Developer Keys → Add LTI Key</li>
            <li>Paste the JWKS URL, Login URL, and Launch URL from above</li>
            <li>Set the method to "Public JWK URL" and add the Target Link URI</li>
            <li>Copy the Client ID from Canvas and register it here</li>
            <li>Enable the Developer Key in Canvas and add the External Tool to your courses</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
