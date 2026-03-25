import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCanvasConfig } from '@/hooks/useCanvasConfig';
import { getCourses, type Course, type CanvasConfig } from '@/lib/canvas-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, BookOpen, Upload, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { CurriculumLesson } from '@/hooks/useCurriculum';

interface CurriculumReadingViewerProps {
  discipline: string;
  title: string;
  onClose: () => void;
}

export function CurriculumReadingViewer({ discipline, title, onClose }: CurriculumReadingViewerProps) {
  const { user } = useAuth();
  const { config } = useCanvasConfig();
  const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [pushOpen, setPushOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // Get all units for this discipline
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('user_id', user.id)
        .eq('discipline', discipline);

      if (!units?.length) {
        setLessons([]);
        setLoading(false);
        return;
      }

      const unitIds = units.map(u => u.id);
      const { data: lessonData } = await supabase
        .from('curriculum_lessons')
        .select('*')
        .eq('user_id', user.id)
        .in('unit_id', unitIds)
        .order('sort_order');

      setLessons((lessonData || []) as unknown as CurriculumLesson[]);
      setLoading(false);
    })();
  }, [user, discipline]);

  const lesson = lessons[currentLesson];

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
            {lesson && (
              <p className="text-xs text-muted-foreground">
                Lesson {currentLesson + 1} of {lessons.length}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config && lessons.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setPushOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Push to Canvas
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg font-semibold text-foreground">No curriculum readings yet</p>
            <p className="text-sm text-muted-foreground mt-1">Generate readings in the Curriculum Editor first</p>
          </div>
        </div>
      ) : lesson ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
              {/* Lesson Title */}
              <div className="text-center space-y-2 pb-4 border-b border-border">
                <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
                {(lesson.objectives as string[])?.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {(lesson.objectives as string[]).map((obj, i) => (
                      <p key={i}>• {obj}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Terms */}
              {(lesson.key_terms as any[])?.length > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-primary">Key Terms</h3>
                  <div className="space-y-1">
                    {(lesson.key_terms as { term: string; definition: string }[]).map((kt, i) => (
                      <p key={i} className="text-sm text-foreground">
                        <span className="font-semibold">{kt.term}</span> — {kt.definition}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Introduction */}
              {(lesson.intro as string[])?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">Introduction</h3>
                  {(lesson.intro as string[]).map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
                  ))}
                </div>
              )}

              {/* Explanation */}
              {(lesson.explanation as string[])?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">Explanation</h3>
                  {(lesson.explanation as string[]).map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
                  ))}
                </div>
              )}

              {/* Reading Passage */}
              {lesson.reading_title && (
                <div className="space-y-3 border-t border-border pt-6">
                  <h3 className="text-lg font-semibold text-foreground">📖 {lesson.reading_title}</h3>
                  {(lesson.reading_paragraphs as string[])?.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90 indent-8">{p}</p>
                  ))}
                </div>
              )}

              {/* Reading Questions */}
              {(lesson.reading_questions as any[])?.length > 0 && (
                <div className="space-y-3 rounded-xl bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold text-foreground">Comprehension Questions</h3>
                  {(lesson.reading_questions as any[]).map((q, i) => {
                    const text = typeof q === 'string' ? q : q.question || q.text || '';
                    return (
                      <p key={i} className="text-sm text-foreground/80">
                        {i + 1}. {text}
                      </p>
                    );
                  })}
                </div>
              )}

              {/* Quiz */}
              {(lesson.quiz as any[])?.length > 0 && (
                <div className="space-y-3 border-t border-border pt-6">
                  <h3 className="text-lg font-semibold text-foreground">Quiz</h3>
                  {(lesson.quiz as any[]).map((q, i) => {
                    const text = typeof q === 'string' ? q : q.question || q.text || '';
                    const options = q.options as string[] | undefined;
                    return (
                      <div key={i} className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{i + 1}. {text}</p>
                        {options?.map((opt, oi) => (
                          <p key={oi} className="text-sm text-muted-foreground ml-4">
                            {String.fromCharCode(65 + oi)}) {opt}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/80">
            <Button
              variant="outline"
              size="sm"
              disabled={currentLesson === 0}
              onClick={() => setCurrentLesson(c => c - 1)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentLesson + 1} / {lessons.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentLesson >= lessons.length - 1}
              onClick={() => setCurrentLesson(c => c + 1)}
              className="gap-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Push to Canvas Dialog */}
      {config && (
        <PushReadingsToCanvasDialog
          open={pushOpen}
          onOpenChange={setPushOpen}
          config={config}
          lessons={lessons}
          bookTitle={title}
        />
      )}
    </div>
  );
}

/* ─── Push to Canvas Dialog ─── */
function PushReadingsToCanvasDialog({
  open,
  onOpenChange,
  config,
  lessons,
  bookTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CanvasConfig;
  lessons: CurriculumLesson[];
  bookTitle: string;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [pageTitle, setPageTitle] = useState(bookTitle);
  const [pushing, setPushing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open && courses.length === 0) {
      setLoadingCourses(true);
      getCourses(config)
        .then(setCourses)
        .catch(() => toast.error('Failed to load Canvas courses'))
        .finally(() => setLoadingCourses(false));
    }
    if (open) {
      setDone(false);
      setProgress(0);
      setPageTitle(bookTitle);
    }
  }, [open, config, bookTitle]);

  const buildHtml = (lesson: CurriculumLesson) => {
    const parts: string[] = [];
    parts.push(`<h2>${lesson.title}</h2>`);

    const objectives = lesson.objectives as string[];
    if (objectives?.length) {
      parts.push('<h3>Learning Objectives</h3><ul>');
      objectives.forEach(o => parts.push(`<li>${o}</li>`));
      parts.push('</ul>');
    }

    const keyTerms = lesson.key_terms as { term: string; definition: string }[];
    if (keyTerms?.length) {
      parts.push('<h3>Key Terms</h3><ul>');
      keyTerms.forEach(kt => parts.push(`<li><strong>${kt.term}</strong> — ${kt.definition}</li>`));
      parts.push('</ul>');
    }

    const intro = lesson.intro as string[];
    if (intro?.length) {
      parts.push('<h3>Introduction</h3>');
      intro.forEach(p => parts.push(`<p>${p}</p>`));
    }

    const explanation = lesson.explanation as string[];
    if (explanation?.length) {
      parts.push('<h3>Explanation</h3>');
      explanation.forEach(p => parts.push(`<p>${p}</p>`));
    }

    if (lesson.reading_title) {
      parts.push(`<h3>Reading: ${lesson.reading_title}</h3>`);
      (lesson.reading_paragraphs as string[])?.forEach(p => parts.push(`<p>${p}</p>`));

      const rqs = lesson.reading_questions as any[];
      if (rqs?.length) {
        parts.push('<h4>Comprehension Questions</h4><ol>');
        rqs.forEach(q => {
          const text = typeof q === 'string' ? q : q.question || q.text || '';
          parts.push(`<li>${text}</li>`);
        });
        parts.push('</ol>');
      }
    }

    return parts.join('\n');
  };

  const handlePush = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }
    setPushing(true);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Please sign in');

      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const html = buildHtml(lesson);
        const lessonTitle = `${pageTitle} - Lesson ${i + 1}: ${lesson.title}`;

        const { data, error } = await supabase.functions.invoke('canvas-proxy', {
          body: {
            action: 'create_page',
            canvasUrl: config.canvasUrl,
            apiToken: config.apiToken,
            courseId: Number(selectedCourseId),
            pageData: {
              title: lessonTitle,
              body: html,
              published: false,
            },
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (error) throw new Error(error.message || 'Failed to create page');
        if (data?.error) throw new Error(data.error);
        setProgress(i + 1);
      }

      setDone(true);
      toast.success(`${lessons.length} reading pages pushed to Canvas!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to push to Canvas');
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Push Readings to Canvas</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-primary" />
            <p className="text-sm font-medium text-foreground">
              {lessons.length} pages created successfully!
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Pages are saved as drafts. Publish them in Canvas when ready.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Canvas Course</Label>
                {loadingCourses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
                  </div>
                ) : (
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger><SelectValue placeholder="Select a course..." /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Page Title Prefix</Label>
                <Input value={pageTitle} onChange={e => setPageTitle(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Each lesson becomes a Canvas Page: "{pageTitle} - Lesson 1: ..."
                </p>
              </div>
            </div>

            {pushing && (
              <div className="space-y-1.5">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress / lessons.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Creating page {progress} of {lessons.length}...
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushing}>Cancel</Button>
              <Button onClick={handlePush} disabled={pushing || !selectedCourseId} className="gap-2">
                {pushing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Pushing...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Push to Canvas</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
