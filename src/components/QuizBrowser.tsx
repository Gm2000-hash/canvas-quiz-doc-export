import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getCourses, getQuizzes, getQuiz, getQuizQuestions, type CanvasConfig, type Course, type Quiz, type QuizQuestion } from '@/lib/canvas-api';
import { tagQuestionsWithNGSS, type NGSSStandard } from '@/lib/ngss-api';
import { exportQuizToDocx } from '@/lib/export-docx';
import { saveQuestionsToBank } from '@/lib/question-bank';
import { toast } from 'sonner';
import { BookOpen, FileText, Download, Loader2, ArrowLeft, ChevronRight, FlaskConical, Sparkles } from 'lucide-react';

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
        {/* Course banner */}
        <div className={`${colorClass} rounded-xl p-6 text-primary-foreground relative overflow-hidden`}>
          <button onClick={handleBack} className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-3 transition-opacity">
            <ArrowLeft className="h-4 w-4" /> All Courses
          </button>
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
                    className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
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
