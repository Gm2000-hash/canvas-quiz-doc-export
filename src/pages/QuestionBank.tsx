import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getQuestionBank, deleteFromBank, type QuestionBankItem } from "@/lib/question-bank";
import { toast } from "sonner";
import { Loader2, Search, Trash2, FlaskConical, BookOpen, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

const QuestionBank = () => {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await getQuestionBank();
      setQuestions(data);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuestions(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteFromBank(id);
      setQuestions(q => q.filter(item => item.id !== id));
      toast.success("Question removed");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  // Collect all unique standards
  const allStandards = Array.from(
    new Set(questions.flatMap(q => q.standards.map(s => s.ngss_code)))
  ).sort();

  // Filter questions
  const filtered = questions.filter(q => {
    const matchesSearch = !search || stripHtml(q.question_text).toLowerCase().includes(search.toLowerCase());
    const matchesStandard = !selectedStandard || q.standards.some(s => s.ngss_code === selectedStandard);
    return matchesSearch && matchesStandard;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 h-16 border-b bg-primary text-primary-foreground flex items-center px-4 gap-4 shadow-md">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Question Bank</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
        {/* Search & filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* NGSS standard filter chips */}
        {allStandards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={!selectedStandard ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedStandard(null)}
            >
              All Standards
            </Badge>
            {allStandards.map(code => (
              <Badge
                key={code}
                variant={selectedStandard === code ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedStandard(selectedStandard === code ? null : code)}
              >
                {code}
              </Badge>
            ))}
          </div>
        )}

        {/* Questions list */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{questions.length === 0 ? "Your question bank is empty. Export a quiz to start building it!" : "No questions match your filter."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{filtered.length} question{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map(q => (
              <Card key={q.id} className="group">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground flex-1">{stripHtml(q.question_text)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {q.standards.map(s => (
                      <Badge key={s.ngss_code} variant="secondary" className="text-xs cursor-help" title={s.ngss_description}>
                        {s.ngss_code}
                      </Badge>
                    ))}
                    {q.source_course && (
                      <span className="text-xs text-muted-foreground">
                        {q.source_course}{q.source_quiz ? ` · ${q.source_quiz}` : ""}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{q.points_possible} pts · {q.question_type.replace(/_/g, " ")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default QuestionBank;
