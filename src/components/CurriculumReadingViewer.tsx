import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCanvasConfig } from '@/hooks/useCanvasConfig';
import { getCourses, type Course, type CanvasConfig } from '@/lib/canvas-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, BookOpen, Upload, Loader2, CheckCircle, Search, List, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { CurriculumLesson } from '@/hooks/useCurriculum';

interface CurriculumReadingViewerProps {
  discipline: string;
  title: string;
  onClose: () => void;
  /** If provided, scroll to this lesson index on open */
  initialLessonIndex?: number;
}

export function CurriculumReadingViewer({ discipline, title, onClose, initialLessonIndex }: CurriculumReadingViewerProps) {
  const { user } = useAuth();
  const { config } = useCanvasConfig();
  const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
  const [unitMap, setUnitMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<number | null>(initialLessonIndex ?? null);
  const [pushOpen, setPushOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToc, setShowToc] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<CurriculumLesson> | null>(null);

  const filteredIndices = lessons.reduce<number[]>((acc, lesson, i) => {
    if (!searchQuery.trim()) { acc.push(i); return acc; }
    const q = searchQuery.toLowerCase();
    const titleMatch = lesson.title.toLowerCase().includes(q);
    const termsMatch = (lesson.key_terms as { term: string; definition: string }[])?.some(
      kt => kt.term.toLowerCase().includes(q) || kt.definition.toLowerCase().includes(q)
    );
    const readingMatch = lesson.reading_title?.toLowerCase().includes(q);
    const textMatch = (lesson.reading_paragraphs as string[])?.some(p => p.toLowerCase().includes(q));
    if (titleMatch || termsMatch || readingMatch || textMatch) acc.push(i);
    return acc;
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: units } = await supabase
        .from('units')
        .select('id, title, sort_order')
        .eq('user_id', user.id)
        .eq('discipline', discipline)
        .order('sort_order');

      if (!units?.length) {
        setLessons([]);
        setLoading(false);
        return;
      }

      const uMap: Record<string, string> = {};
      units.forEach(u => { uMap[u.id] = u.title; });
      setUnitMap(uMap);

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

  useEffect(() => {
    if (initialLessonIndex != null && initialLessonIndex >= 0) {
      setCurrentLesson(initialLessonIndex);
    }
  }, [initialLessonIndex]);

  const lesson = currentLesson !== null ? lessons[currentLesson] : undefined;

  // Enter edit mode
  const startEditing = () => {
    if (!lesson) return;
    setEditData({
      title: lesson.title,
      objectives: [...(lesson.objectives as string[])],
      key_terms: [...(lesson.key_terms as { term: string; definition: string }[])].map(kt => ({ ...kt })),
      intro: [...(lesson.intro as string[])],
      explanation: [...(lesson.explanation as string[])],
      reading_title: lesson.reading_title,
      reading_paragraphs: [...(lesson.reading_paragraphs as string[] || [])],
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditData(null);
  };

  const saveEdits = async () => {
    if (!lesson || !editData || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('curriculum_lessons')
        .update({
          title: editData.title,
          objectives: editData.objectives as any,
          key_terms: editData.key_terms as any,
          intro: editData.intro as any,
          explanation: editData.explanation as any,
          reading_title: editData.reading_title,
          reading_paragraphs: editData.reading_paragraphs as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lesson.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const updated = [...lessons];
      updated[currentLesson] = { ...lesson, ...editData } as CurriculumLesson;
      setLessons(updated);
      setEditing(false);
      setEditData(null);
      toast.success('Reading saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Helper to update editData arrays
  const updateEditArray = (field: keyof CurriculumLesson, index: number, value: string) => {
    if (!editData) return;
    const arr = [...(editData[field] as string[])];
    arr[index] = value;
    setEditData({ ...editData, [field]: arr });
  };

  const updateEditKeyTerm = (index: number, key: 'term' | 'definition', value: string) => {
    if (!editData) return;
    const terms = [...(editData.key_terms as { term: string; definition: string }[])];
    terms[index] = { ...terms[index], [key]: value };
    setEditData({ ...editData, key_terms: terms });
  };


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
          {lessons.length > 1 && currentLesson !== null && (
            <Button variant="ghost" size="icon" onClick={() => setCurrentLesson(null)} title="Table of Contents">
              <List className="h-4 w-4" />
            </Button>
          )}
          {/* Edit / Save toggle */}
          {lesson && !editing && (
            <Button variant="outline" size="sm" className="gap-2" onClick={startEditing}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
          {editing && (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>Cancel</Button>
              <Button size="sm" className="gap-2" onClick={saveEdits} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </>
          )}
          {config && lessons.length > 0 && !editing && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setPushOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Push to Canvas
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search & TOC panel */}
      {!loading && lessons.length > 0 && showToc && (
        <div className="border-b border-border bg-card/60 px-4 py-2 space-y-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search lessons, terms, readings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-0.5">
              {filteredIndices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No lessons match "{searchQuery}"</p>
              ) : (
                filteredIndices.map(idx => (
                  <button
                    key={idx}
                    onClick={() => { setCurrentLesson(idx); setShowToc(false); if (editing) cancelEditing(); }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                      idx === currentLesson
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="text-xs text-muted-foreground mr-2">{idx + 1}.</span>
                    {lessons[idx].title}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

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
      ) : currentLesson === null ? (
        /* ─── TABLE OF CONTENTS LANDING ─── */
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
              <div className="text-center space-y-2 pb-6 border-b border-border">
                <BookOpen className="h-10 w-10 mx-auto text-primary/60" />
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">Table of Contents</p>
              </div>

              {(() => {
                // Group lessons by unit
                const unitOrder = Object.keys(unitMap);
                const grouped: { unitId: string; unitTitle: string; lessons: { index: number; lesson: CurriculumLesson }[] }[] = [];
                const groupMap = new Map<string, { unitId: string; unitTitle: string; lessons: { index: number; lesson: CurriculumLesson }[] }>();

                lessons.forEach((l, i) => {
                  if (!groupMap.has(l.unit_id)) {
                    const group = { unitId: l.unit_id, unitTitle: unitMap[l.unit_id] || 'Unknown Unit', lessons: [] as { index: number; lesson: CurriculumLesson }[] };
                    groupMap.set(l.unit_id, group);
                    grouped.push(group);
                  }
                  groupMap.get(l.unit_id)!.lessons.push({ index: i, lesson: l });
                });

                // Sort groups by the unit order from the database
                grouped.sort((a, b) => unitOrder.indexOf(a.unitId) - unitOrder.indexOf(b.unitId));

                return grouped.map((group, gi) => (
                  <div key={group.unitId} className="space-y-2">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {gi + 1}
                      </span>
                      {group.unitTitle}
                    </h2>
                    <div className="ml-8 space-y-0.5">
                      {group.lessons.map(({ index, lesson: l }) => (
                        <button
                          key={l.id}
                          onClick={() => setCurrentLesson(index)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-primary/5 transition-colors group flex items-center gap-3"
                        >
                          <span className="text-xs text-muted-foreground/60 w-6 shrink-0 text-right">{index + 1}.</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-foreground group-hover:text-primary transition-colors">{l.title}</span>
                            {l.reading_title && (
                              <span className="block text-[11px] text-muted-foreground mt-0.5">📖 {l.reading_title}</span>
                            )}
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}

              <div className="text-center pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">{lessons.length} lessons across {Object.keys(unitMap).length} units</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : lesson ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div
              className="max-w-2xl mx-auto px-6 py-8 space-y-6 prose-links"
              onClick={(e) => {
                if (editing) return;
                const target = e.target as HTMLElement;
                if (target.tagName === 'A') {
                  e.preventDefault();
                  const href = (target as HTMLAnchorElement).href;
                  if (href) window.open(href, '_blank', 'noopener');
                }
              }}
            >
              {editing && editData ? (
                /* ─── EDIT MODE ─── */
                <>
                  {/* Title */}
                  <div className="text-center space-y-2 pb-4 border-b border-border">
                    <Input
                      value={editData.title || ''}
                      onChange={e => setEditData({ ...editData, title: e.target.value })}
                      className="text-2xl font-bold text-center border-dashed"
                    />
                  </div>

                  {/* Objectives */}
                  {(editData.objectives as string[])?.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Objectives</Label>
                      {(editData.objectives as string[]).map((obj, i) => (
                        <Input
                          key={i}
                          value={obj}
                          onChange={e => updateEditArray('objectives', i, e.target.value)}
                          className="text-sm border-dashed"
                        />
                      ))}
                    </div>
                  )}

                  {/* Key Terms */}
                  {(editData.key_terms as any[])?.length > 0 && (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-3">
                      <Label className="text-xs font-semibold text-primary uppercase">Key Terms</Label>
                      {(editData.key_terms as { term: string; definition: string }[]).map((kt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={kt.term}
                            onChange={e => updateEditKeyTerm(i, 'term', e.target.value)}
                            className="w-1/3 text-sm font-semibold border-dashed"
                            placeholder="Term"
                          />
                          <Input
                            value={kt.definition}
                            onChange={e => updateEditKeyTerm(i, 'definition', e.target.value)}
                            className="flex-1 text-sm border-dashed"
                            placeholder="Definition"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Introduction */}
                  {(editData.intro as string[])?.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Introduction</Label>
                      {(editData.intro as string[]).map((p, i) => (
                        <Textarea
                          key={i}
                          value={p}
                          onChange={e => updateEditArray('intro', i, e.target.value)}
                          rows={3}
                          className="text-sm border-dashed"
                        />
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  {(editData.explanation as string[])?.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Explanation</Label>
                      {(editData.explanation as string[]).map((p, i) => (
                        <Textarea
                          key={i}
                          value={p}
                          onChange={e => updateEditArray('explanation', i, e.target.value)}
                          rows={3}
                          className="text-sm border-dashed"
                        />
                      ))}
                    </div>
                  )}

                  {/* Reading Passage */}
                  {editData.reading_title != null && (
                    <div className="space-y-2 border-t border-border pt-6">
                      <div className="flex items-center gap-2">
                        <span>📖</span>
                        <Input
                          value={editData.reading_title || ''}
                          onChange={e => setEditData({ ...editData, reading_title: e.target.value })}
                          className="text-lg font-semibold border-dashed"
                          placeholder="Reading title"
                        />
                      </div>
                      {(editData.reading_paragraphs as string[])?.map((p, i) => (
                        <Textarea
                          key={i}
                          value={p}
                          onChange={e => updateEditArray('reading_paragraphs', i, e.target.value)}
                          rows={4}
                          className="text-sm border-dashed"
                        />
                      ))}
                    </div>
                  )}

                </>
              ) : (
                /* ─── READ MODE ─── */
                <>
                  {/* Lesson Title */}
                  <div className="text-center space-y-2 pb-4 border-b border-border">
                    <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
                    {(lesson.objectives as string[])?.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {(lesson.objectives as string[]).map((obj, i) => (
                          <p key={i} dangerouslySetInnerHTML={{ __html: `• ${obj}` }} />
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
                            <span className="font-semibold">{kt.term}</span> — <span dangerouslySetInnerHTML={{ __html: kt.definition }} />
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
                        <p key={i} className="text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: p }} />
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  {(lesson.explanation as string[])?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">Explanation</h3>
                      {(lesson.explanation as string[]).map((p, i) => (
                        <p key={i} className="text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: p }} />
                      ))}
                    </div>
                  )}

                  {/* Reading Passage */}
                  {lesson.reading_title && (
                    <div className="space-y-3 border-t border-border pt-6">
                      <h3 className="text-lg font-semibold text-foreground">📖 {lesson.reading_title}</h3>
                      {(lesson.reading_paragraphs as string[])?.map((p, i) => (
                        <p key={i} className="text-sm leading-relaxed text-foreground/90 indent-8" dangerouslySetInnerHTML={{ __html: p }} />
                      ))}
                    </div>
                  )}

                </>
              )}
            </div>
          </ScrollArea>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/80">
            <Button
              variant="outline"
              size="sm"
              disabled={editing}
              onClick={() => {
                if (currentLesson === 0 || currentLesson === null) {
                  setCurrentLesson(null);
                } else {
                  setCurrentLesson(c => (c ?? 1) - 1);
                }
                if (editing) cancelEditing();
              }}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> {currentLesson === 0 ? 'Contents' : 'Previous'}
            </Button>
            <button
              onClick={() => { setCurrentLesson(null); if (editing) cancelEditing(); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {currentLesson !== null ? `${currentLesson + 1} / ${lessons.length}` : 'Table of Contents'}
            </button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentLesson !== null && currentLesson >= lessons.length - 1 || editing}
              onClick={() => {
                if (currentLesson === null) {
                  setCurrentLesson(0);
                } else {
                  setCurrentLesson(c => (c ?? -1) + 1);
                }
                if (editing) cancelEditing();
              }}
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
