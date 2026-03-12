import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCourses, getQuizzes, getQuiz, getQuizQuestions, type CanvasConfig, type Course, type Quiz, type QuizQuestion } from '@/lib/canvas-api';
import { tagQuestionsWithNGSS, type NGSSStandard } from '@/lib/ngss-api';
import { exportQuizToDocx } from '@/lib/export-docx';
import { saveQuestionsToBank } from '@/lib/question-bank';
import { toast } from 'sonner';
import { BookOpen, FileText, Download, Loader2, ArrowLeft, ChevronRight, FlaskConical, Sparkles, Palette } from 'lucide-react';

interface QuizBrowserProps {
  config: CanvasConfig;
}

const COURSE_COLORS = [
  'bg-primary',
  'bg-[hsl(210,70%,50%)]',
  'bg-[hsl(340,65%,47%)]',
  'bg-[hsl(262,60%,50%)]',
  'bg-[hsl(25,85%,55%)]',
  'bg-[hsl(190,70%,42%)]',
];

const ALL_COLORS = [
  { label: 'Blue', class: 'bg-primary', swatch: 'hsl(211,100%,50%)' },
  { label: 'Sky', class: 'bg-[hsl(210,70%,50%)]', swatch: 'hsl(210,70%,50%)' },
  { label: 'Rose', class: 'bg-[hsl(340,65%,47%)]', swatch: 'hsl(340,65%,47%)' },
  { label: 'Purple', class: 'bg-[hsl(262,60%,50%)]', swatch: 'hsl(262,60%,50%)' },
  { label: 'Orange', class: 'bg-[hsl(25,85%,55%)]', swatch: 'hsl(25,85%,55%)' },
  { label: 'Teal', class: 'bg-[hsl(190,70%,42%)]', swatch: 'hsl(190,70%,42%)' },
  { label: 'Green', class: 'bg-[hsl(142,60%,40%)]', swatch: 'hsl(142,60%,40%)' },
  { label: 'Amber', class: 'bg-[hsl(45,90%,48%)]', swatch: 'hsl(45,90%,48%)' },
  { label: 'Indigo', class: 'bg-[hsl(230,65%,52%)]', swatch: 'hsl(230,65%,52%)' },
  { label: 'Slate', class: 'bg-[hsl(215,20%,40%)]', swatch: 'hsl(215,20%,40%)' },
  { label: 'Fuchsia', class: 'bg-[hsl(292,60%,50%)]', swatch: 'hsl(292,60%,50%)' },
  { label: 'Red', class: 'bg-[hsl(0,70%,50%)]', swatch: 'hsl(0,70%,50%)' },
];

function loadCourseColors(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('course-tile-colors') || '{}');
  } catch { return {}; }
}

function saveCourseColors(map: Record<string, string>) {
  localStorage.setItem('course-tile-colors', JSON.stringify(map));
}

export function QuizBrowser({ config }: QuizBrowserProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [includeNGSS, setIncludeNGSS] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [courseColors, setCourseColors] = useState<Record<string, string>>(loadCourseColors);

  const getColorForCourse = useCallback((courseId: number, idx: number) => {
    return courseColors[String(courseId)] || COURSE_COLORS[idx % COURSE_COLORS.length];
  }, [courseColors]);

  const setCourseColor = useCallback((courseId: number, colorClass: string) => {
    setCourseColors(prev => {
      const next = { ...prev, [String(courseId)]: colorClass };
      saveCourseColors(next);
      return next;
    });
  }, []);

  // NGSS tagging state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [ngssTags, setNgssTags] = useState<Map<number, NGSSStandard[]>>(new Map());
  const [loadingNGSS, setLoadingNGSS] = useState(false);
  const [ngssLoaded, setNgssLoaded] = useState(false);

  useEffect(() => {
    setLoadingCourses(true);
    getCourses(config)
      .then(setCourses)
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoadingCourses(false));
  }, [config]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedQuizId('');
    setQuestions([]);
    setNgssTags(new Map());
    setNgssLoaded(false);
    setLoadingQuizzes(true);
    getQuizzes(config, course.id)
      .then(setQuizzes)
      .catch(() => toast.error('Failed to load quizzes'))
      .finally(() => setLoadingQuizzes(false));
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setQuizzes([]);
    setSelectedQuizId('');
    setQuestions([]);
    setNgssTags(new Map());
    setNgssLoaded(false);
  };

  const handleSelectQuiz = async (quizId: string) => {
    setSelectedQuizId(quizId);
    setNgssTags(new Map());
    setNgssLoaded(false);

    if (!selectedCourse) return;

    // Fetch questions and auto-tag with NGSS
    setLoadingNGSS(true);
    try {
      const qs = await getQuizQuestions(config, selectedCourse.id, Number(quizId));
      setQuestions(qs);
      const filtered = qs.filter(q => q.question_type !== 'text_only_question');
      if (filtered.length > 0) {
        const tags = await tagQuestionsWithNGSS(
          filtered.map(q => ({ id: q.id, question_text: q.question_text }))
        );
        setNgssTags(tags);
      }
      setNgssLoaded(true);
    } catch (err) {
      console.error('NGSS tagging error:', err);
      toast.error('Failed to analyze NGSS standards. You can still export without them.');
      setNgssLoaded(true);
    } finally {
      setLoadingNGSS(false);
    }
  };

  const handleExport = async () => {
    if (!selectedCourse || !selectedQuizId) {
      toast.error('Please select a quiz');
      return;
    }

    setExporting(true);
    try {
      const quiz = await getQuiz(config, selectedCourse.id, Number(selectedQuizId));
      const qs = questions.length > 0 ? questions : await getQuizQuestions(config, selectedCourse.id, Number(selectedQuizId));

      await exportQuizToDocx(
        quiz,
        qs,
        selectedCourse.name,
        includeAnswerKey,
        includeNGSS ? ngssTags : undefined
      );

      // Auto-save to question bank
      try {
        await saveQuestionsToBank(qs, ngssTags, selectedCourse.name, quiz.title);
      } catch (err) {
        console.warn('Question bank save skipped:', err);
      }

      toast.success(includeAnswerKey ? 'Quiz and answer key downloaded!' : 'Quiz downloaded!');
    } catch (err) {
      toast.error('Failed to export quiz. Please try again.');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (loadingCourses) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Course detail / quiz view
  if (selectedCourse) {
    const colorIdx = courses.indexOf(selectedCourse) % COURSE_COLORS.length;
    const colorClass = COURSE_COLORS[colorIdx];
    const filteredQuestions = questions.filter(q => q.question_type !== 'text_only_question');

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* iOS-style back nav */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-primary font-medium text-sm hover:opacity-70 transition-opacity -mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          All Courses
        </button>

        {/* Course banner */}
        <div className={`${colorClass} rounded-2xl p-6 text-primary-foreground relative overflow-hidden`}>
          <h2 className="text-2xl font-bold">{selectedCourse.name}</h2>
          {selectedCourse.course_code && (
            <p className="text-sm opacity-80 mt-1">{selectedCourse.course_code}</p>
          )}
        </div>

        {/* Quizzes list */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Quizzes</h3>
          {loadingQuizzes ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading quizzes...
            </div>
          ) : quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No quizzes found in this course.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {quizzes.map((quiz) => {
                const isSelected = selectedQuizId === String(quiz.id);
                return (
                  <Card
                    key={quiz.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleSelectQuiz(String(quiz.id))}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground">{quiz.question_count} questions</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* NGSS Standards Preview */}
        {selectedQuizId && (
          <>
            {loadingNGSS ? (
              <Card className="border-accent/30">
                <CardContent className="flex items-center gap-3 p-4 text-muted-foreground">
                  <Sparkles className="h-5 w-5 animate-pulse text-accent-foreground" />
                  <span className="text-sm">Analyzing questions for NGSS standards...</span>
                  <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                </CardContent>
              </Card>
            ) : ngssLoaded && filteredQuestions.length > 0 ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-foreground text-sm">NGSS Standards Alignment</h4>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredQuestions.map((q, idx) => {
                      const standards = ngssTags.get(q.id) || [];
                      return (
                        <div key={q.id} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground font-mono shrink-0 w-6 text-right">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            {standards.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {standards.map((s) => (
                                  <Badge
                                    key={s.code}
                                    variant="secondary"
                                    className="text-xs cursor-help"
                                    title={s.description}
                                  >
                                    {s.code}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">No matching standard</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Export bar */}
            <Card className="border-primary/20 bg-card">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="answerKey"
                      checked={includeAnswerKey}
                      onCheckedChange={(checked) => setIncludeAnswerKey(checked === true)}
                    />
                    <Label htmlFor="answerKey" className="text-sm">Include Answer Key</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeNGSS"
                      checked={includeNGSS}
                      onCheckedChange={(checked) => setIncludeNGSS(checked === true)}
                      disabled={ngssTags.size === 0}
                    />
                    <Label htmlFor="includeNGSS" className="text-sm">Include NGSS Standards</Label>
                  </div>
                </div>
                <div className="sm:ml-auto">
                  <Button onClick={handleExport} disabled={exporting || loadingNGSS} size="lg" className="gap-2">
                    {exporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Export as Word
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  // Course grid
  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course, idx) => {
          const colorClass = COURSE_COLORS[idx % COURSE_COLORS.length];
          return (
            <Card
              key={course.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 group"
              onClick={() => handleSelectCourse(course)}
            >
              <div className={`${colorClass} p-5 pb-12 text-primary-foreground relative`}>
                <h3 className="text-lg font-bold leading-tight line-clamp-2">{course.name}</h3>
                {course.course_code && (
                  <p className="text-sm opacity-80 mt-1">{course.course_code}</p>
                )}
              </div>
              <CardContent className="p-4 flex items-center justify-between -mt-6 relative">
                <div className="h-12 w-12 rounded-full bg-card border-2 border-background shadow flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  View quizzes →
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
