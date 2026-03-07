import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getCourses, getQuizzes, getQuiz, getQuizQuestions, type CanvasConfig, type Course, type Quiz } from '@/lib/canvas-api';
import { exportQuizToDocx } from '@/lib/export-docx';
import { toast } from 'sonner';
import { BookOpen, FileText, Download, Loader2, GraduationCap } from 'lucide-react';

interface QuizBrowserProps {
  config: CanvasConfig;
}

export function QuizBrowser({ config }: QuizBrowserProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
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

  useEffect(() => {
    if (!selectedCourseId) {
      setQuizzes([]);
      return;
    }
    setSelectedQuizId('');
    setLoadingQuizzes(true);
    getQuizzes(config, Number(selectedCourseId))
      .then(setQuizzes)
      .catch(() => toast.error('Failed to load quizzes'))
      .finally(() => setLoadingQuizzes(false));
  }, [selectedCourseId, config]);

  const selectedCourse = courses.find(c => String(c.id) === selectedCourseId);

  const handleExport = async () => {
    if (!selectedCourseId || !selectedQuizId) {
      toast.error('Please select a course and quiz');
      return;
    }

    setExporting(true);
    try {
      const [quiz, questions] = await Promise.all([
        getQuiz(config, Number(selectedCourseId), Number(selectedQuizId)),
        getQuizQuestions(config, Number(selectedCourseId), Number(selectedQuizId)),
      ]);

      await exportQuizToDocx(quiz, questions, selectedCourse?.name || 'Unknown Course', includeAnswerKey);
      toast.success(
        includeAnswerKey
          ? 'Quiz and answer key downloaded!'
          : 'Quiz downloaded!'
      );
    } catch (err) {
      toast.error('Failed to export quiz. Please try again.');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Course selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            Select Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCourses ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading courses...
            </div>
          ) : (
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={String(course.id)}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Quiz selector */}
      {selectedCourseId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Select Quiz
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingQuizzes ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading quizzes...
              </div>
            ) : quizzes.length === 0 ? (
              <p className="text-muted-foreground">No quizzes found in this course.</p>
            ) : (
              <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a quiz..." />
                </SelectTrigger>
                <SelectContent>
                  {quizzes.map(quiz => (
                    <SelectItem key={quiz.id} value={String(quiz.id)}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{quiz.title}</span>
                        <span className="text-muted-foreground text-xs">
                          ({quiz.question_count} questions)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export options */}
      {selectedQuizId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              Export Options
            </CardTitle>
            <CardDescription>
              A printable student quiz will always be generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="answerKey"
                checked={includeAnswerKey}
                onCheckedChange={(checked) => setIncludeAnswerKey(checked === true)}
              />
              <Label htmlFor="answerKey">Also generate Answer Key</Label>
            </div>

            <Button onClick={handleExport} disabled={exporting} className="w-full" size="lg">
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Word Document...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export as Word Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
