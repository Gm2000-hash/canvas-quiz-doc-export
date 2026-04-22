import { useEffect, useState } from "react";
import { Sparkles, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AVAILABLE_MODELS, DEFAULT_MODEL, useAiPreferences, type AiPreferences, type ModelTier } from "@/hooks/useAiPreferences";

const USE_DEFAULT = "__default__";

const TIER_LABELS: Record<Exclude<ModelTier, "default">, { title: string; description: string }> = {
  heavy: {
    title: "Heavy generation",
    description: "ISAT exams, escape rooms, full curriculum readings",
  },
  utility: {
    title: "Utility tasks",
    description: "Standards tagging, key terms, DOK/Bloom's suggestions",
  },
};

export function AiPreferencesCard() {
  const { preferences, loading, save } = useAiPreferences();
  const [draft, setDraft] = useState<AiPreferences>(preferences);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const setOverride = (tier: Exclude<ModelTier, "default">, value: string) => {
    setDraft((prev) => {
      const next = { ...prev, overrides: { ...prev.overrides } };
      if (!value || value === USE_DEFAULT) {
        delete next.overrides[tier];
      } else {
        next.overrides[tier] = value;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await save(draft);
    setSaving(false);
    if (error) {
      toast.error("Failed to save AI preferences");
    } else {
      toast.success("AI preferences saved");
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Engine Settings
        </CardTitle>
        <CardDescription className="text-sm">
          Choose which AI engine powers the generators across the app. You can override per task type, or per generation run.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm">Default engine</Label>
              <p className="text-xs text-muted-foreground">
                Used everywhere unless a specific override below applies.
              </p>
              <Select
                value={draft.default_model || DEFAULT_MODEL}
                onValueChange={(v) => setDraft((prev) => ({ ...prev, default_model: v }))}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col">
                        <span>{m.label}</span>
                        {m.description && (
                          <span className="text-[10px] text-muted-foreground">{m.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label className="text-sm">Per-task overrides (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Pick a different engine for heavy or utility jobs. Leave on default to use your default engine above.
                </p>
              </div>

              {(Object.keys(TIER_LABELS) as Array<keyof typeof TIER_LABELS>).map((tier) => {
                const meta = TIER_LABELS[tier];
                const value = draft.overrides[tier] ?? USE_DEFAULT;
                return (
                  <div key={tier} className="space-y-1.5">
                    <Label className="text-sm font-medium">{meta.title}</Label>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                    <Select value={value} onValueChange={(v) => setOverride(tier, v)}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={USE_DEFAULT}>Use my default engine</SelectItem>
                        {AVAILABLE_MODELS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <div className="flex flex-col">
                              <span>{m.label}</span>
                              {m.description && (
                                <span className="text-[10px] text-muted-foreground">{m.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save AI Settings
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
