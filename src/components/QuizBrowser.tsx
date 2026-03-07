import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCourses, getQuizzes, getQuiz, getQuizQuestions, type CanvasConfig, type Course, type Quiz } from '@/lib/canvas-api';
import { exportQuizToDocx } from '@/lib/export-docx';
import { toast } from 'sonner';
import { BookOpen, FileText, Download, Loader2, ArrowLeft, ChevronRight } from 'lucide-react';

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
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [exporting, setExporting] = useState(false);

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
  };

  const handleExport = async () => {
    if (!selectedCourse || !selectedQuizId) {
      toast.error('Please select a quiz');
      return;
    }

    setExporting(true);
    try {
      const [quiz, questions] = await Promise.all([
        getQuiz(config, selectedCourse.id, Number(selectedQuizId)),
        getQuizQuestions(config, selectedCourse.id, Number(selectedQuizId)),
      ]);

      await exportQuizToDocx(quiz, questions, selectedCourse.name, includeAnswerKey);
      toast.success(includeAnswerKey ? 'Quiz and answer key downloaded!' : 'Quiz downloaded!');
    } catch (err) {
      toast.error('Failed to export quiz. Please try again.');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // Loading state
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
                    onClick={() => setSelectedQuizId(String(quiz.id))}
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

        {/* Export bar */}
        {selectedQuizId && (
          <Card className="border-primary/20 bg-card">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="answerKey"
                  checked={includeAnswerKey}
                  onCheckedChange={(checked) => setIncludeAnswerKey(checked === true)}
                />
                <Label htmlFor="answerKey" className="text-sm">Include Answer Key</Label>
              </div>
              <div className="sm:ml-auto">
                <Button onClick={handleExport} disabled={exporting} size="lg" className="gap-2">
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
        )}
      </div>
    );
  }

  // Course grid (Google Classroom style)
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
