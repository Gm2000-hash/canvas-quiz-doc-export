import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Leaf, Globe, Atom } from "lucide-react";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { generateForCoreIdea, generateForDiscipline, type GenerationProgress } from "@/lib/question-generator";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const DISCIPLINES = [
  { key: "LS", label: "Life Science", icon: Leaf, coreIdeas: ["MS-LS1", "MS-LS2", "MS-LS3", "MS-LS4"] },
  { key: "ESS", label: "Earth & Space Science", icon: Globe, coreIdeas: ["MS-ESS1", "MS-ESS2", "MS-ESS3"] },
  { key: "PS", label: "Physical Science", icon: Atom, coreIdeas: ["MS-PS1", "MS-PS2", "MS-PS3", "MS-PS4"] },
];

type GenerateTarget = { type: "coreIdea"; id: string } | { type: "discipline"; key: string } | { type: "all" };

export default function GenerateQuestionsDialog({ open, onOpenChange, onComplete }: Props) {
  const [questionsPerSub, setQuestionsPerSub] = useState(10);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const abortRef = useRef(false);
  const latestProgressRef = useRef<GenerationProgress | null>(null);

  const handleProgressUpdate = (p: GenerationProgress) => {
    latestProgressRef.current = p;
    setProgress(p);
  };

  const handleGenerate = async (target: GenerateTarget) => {
    setGenerating(true);
    setDone(false);
    abortRef.current = false;
    latestProgressRef.current = null;

    try {
      if (target.type === "coreIdea") {
        await generateForCoreIdea(target.id, questionsPerSub, handleProgressUpdate);
      } else if (target.type === "discipline") {
        const disc = DISCIPLINES.find(d => d.key === target.key);
        if (disc) await generateForDiscipline(disc.coreIdeas, questionsPerSub, handleProgressUpdate);
      } else {
        const allCoreIdeas = DISCIPLINES.flatMap(d => d.coreIdeas);
        await generateForDiscipline(allCoreIdeas, questionsPerSub, handleProgressUpdate);
      }
      setDone(true);
      const total = latestProgressRef.current?.questionsGenerated ?? 0;
      toast.success(`Generated ${total} questions!`);
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setProgress(null);
    setDone(false);
  };

  const progressPct = progress ? Math.round((progress.completed / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!generating) { onOpenChange(v); reset(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Sample Questions
          </DialogTitle>
          <DialogDescription>
            Use AI to generate ISAT-style questions for each NGSS substandard. Questions include multi-step, multiple choice, drag-and-drop, and multi-select types.
          </DialogDescription>
        </DialogHeader>

        {/* Progress view */}
        {(generating || done) && progress ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {done ? "Complete!" : `Generating for ${progress.current || "..."}` }
                </span>
                <span className="font-medium">{progress.completed}/{progress.total} standards</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              )}
              <div className="text-sm">
                <span className="font-medium">{progress.questionsGenerated}</span> questions generated
                {progress.errors.length > 0 && (
                  <span className="text-destructive ml-2">· {progress.errors.length} errors</span>
                )}
              </div>
            </div>

            {progress.errors.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {progress.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {done && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Close</Button>
                <Button onClick={reset}>Generate More</Button>
              </div>
            )}
          </div>
        ) : (
          /* Selection view */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Questions per substandard</Label>
              <Select value={questionsPerSub} onValueChange={setQuestionsPerSub}>
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate All */}
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={() => handleGenerate({ type: "all" })}
              disabled={generating}
            >
              <Sparkles className="h-4 w-4" />
              Generate All ({Object.values(ALL_SUBSTANDARDS).reduce((s, a) => s + a.length, 0) * parseInt(questionsPerSub)} questions)
            </Button>

            <div className="text-xs text-muted-foreground text-center">— or generate by discipline / core idea —</div>

            {/* Per discipline */}
            {DISCIPLINES.map(disc => {
              const Icon = disc.icon;
              const subCount = disc.coreIdeas.reduce((s, ci) => s + (ALL_SUBSTANDARDS[ci]?.length || 0), 0);
              return (
                <div key={disc.key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{disc.label}</span>
                      <Badge variant="secondary" className="text-xs">{subCount} standards</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={() => handleGenerate({ type: "discipline", key: disc.key })}
                      disabled={generating}
                    >
                      <Sparkles className="h-3 w-3" /> Generate All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {disc.coreIdeas.map(ci => {
                      const count = ALL_SUBSTANDARDS[ci]?.length || 0;
                      return (
                        <Button
                          key={ci}
                          variant="ghost"
                          size="sm"
                          className="justify-start text-xs h-8 gap-1.5"
                          onClick={() => handleGenerate({ type: "coreIdea", id: ci })}
                          disabled={generating}
                        >
                          <Badge variant="outline" className="text-[10px] px-1.5">{ci}</Badge>
                          <span className="text-muted-foreground">{count} subs</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
