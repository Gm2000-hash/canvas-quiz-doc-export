import { useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap } from "lucide-react";
import sketchCanvas from "@/assets/sketch-canvas-export.png";
import sketchQuestionBank from "@/assets/sketch-question-bank.png";
import sketchLessonPlanner from "@/assets/sketch-lesson-planner.png";
import sketchCreateQuestion from "@/assets/sketch-create-question.png";

const tiles = [
  {
    title: "Canvas Quiz Exporter",
    description: "Connect to Canvas LMS and export quizzes as formatted Word documents.",
    path: "/canvas",
    image: sketchCanvas,
  },
  {
    title: "Question Bank",
    description: "Browse, search, and manage your library of assessment questions.",
    path: "/question-bank",
    image: sketchQuestionBank,
  },
  {
    title: "Create Question",
    description: "Build new questions with DOK levels, Bloom's taxonomy, and NGSS tags.",
    path: "/create-question",
    image: sketchCreateQuestion,
  },
  {
    title: "Lesson Planner",
    description: "Organize units, generate AI lesson plans, and export pacing guides.",
    path: "/lesson-planner",
    image: sketchLessonPlanner,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold text-foreground">Teaching Toolkit</span>
        </div>
      </header>

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            What would you like to work on today?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {tiles.map((tile) => (
            <button
              key={tile.path}
              onClick={() => navigate(tile.path)}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 text-left transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-5">
                <div className="shrink-0 h-20 w-20 rounded-xl bg-accent/60 flex items-center justify-center overflow-hidden">
                  <img
                    src={tile.image}
                    alt={tile.title}
                    className="h-16 w-16 object-contain transition-transform duration-200 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {tile.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {tile.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
