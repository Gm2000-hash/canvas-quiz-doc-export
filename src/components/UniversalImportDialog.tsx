import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ParsedLesson {
  title: string;
  objectives?: string;
  activities?: string;
  materials?: string;
  assessment?: string;
  notes?: string;
  duration_minutes?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: { id: string; title: string; discipline?: string }[];
  onImported: () => void;
}

const ACCEPTED_TYPES = ".docx,.xlsx,.pptx,.pdf,.txt,.md,.csv";

export function UniversalImportDialog({ open, onOpenChange, units, onImported }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "review">("upload");
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsedLessons, setParsedLessons] = useState<ParsedLesson[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [unitId, setUnitId] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setStep("upload");
    setUploading(false);
    setImporting(false);
    setFileName("");
    setParsedLessons([]);
    setSelected(new Set());
    setUnitId("");
    setError("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB");
      return;
    }

    setFileName(file.name);
    setError("");
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-import-file`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse file");
      }

      if (!data.lessons || data.lessons.length === 0) {
        throw new Error("No lesson content could be extracted from this file");
      }

      setParsedLessons(data.lessons);
      setSelected(new Set(data.lessons.map((_: unknown, i: number) => i)));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleLesson = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleImport = async () => {
    if (!user || !unitId || selected.size === 0) return;
    setImporting(true);

    try {
      const lessonsToImport = parsedLessons
        .filter((_, i) => selected.has(i))
        .map((l, i) => ({
          user_id: user.id,
          unit_id: unitId,
          title: l.title || `Imported Lesson ${i + 1}`,
          objectives: l.objectives || null,
          activities: l.activities ? [{ title: "Activities", description: l.activities }] : null,
          materials: l.materials || null,
          assessment: l.assessment || null,
          notes: l.notes || null,
          duration_minutes: l.duration_minutes || null,
          sort_order: i,
        }));

      const { error: insertError } = await supabase
        .from("lesson_plans")
        .insert(lessonsToImport);

      if (insertError) throw insertError;

      toast({ title: `Imported ${lessonsToImport.length} lesson(s) from ${fileName}` });
      onImported();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import File
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Upload a document and AI will extract lesson plan content from it.
              Supports <strong>.docx, .xlsx, .pptx, .pdf, .txt, .md, .csv</strong>.
            </p>

            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Parsing {fileName}…</p>
                </>
              ) : (
                <>
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">
                    Click to select a file
                  </p>
                  <p className="text-xs text-muted-foreground">Max 10MB</p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileSelect}
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {parsedLessons.length} lesson(s) found in {fileName}
              </Badge>
              <Button variant="ghost" size="sm" onClick={reset}>
                Choose different file
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Import into Unit</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit…" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[240px] border rounded-lg">
              <div className="p-2 space-y-1">
                {parsedLessons.map((lesson, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(idx)}
                      onCheckedChange={() => toggleLesson(idx)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lesson.title || `Lesson ${idx + 1}`}
                      </p>
                      {lesson.objectives && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {lesson.objectives}
                        </p>
                      )}
                    </div>
                    {lesson.duration_minutes && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {lesson.duration_minutes}m
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selected.size === parsedLessons.length) {
                    setSelected(new Set());
                  } else {
                    setSelected(new Set(parsedLessons.map((_, i) => i)));
                  }
                }}
              >
                {selected.size === parsedLessons.length ? "Deselect All" : "Select All"}
              </Button>

              <Button
                onClick={handleImport}
                disabled={importing || !unitId || selected.size === 0}
                className="gap-2 rounded-xl"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Import {selected.size} Lesson(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
