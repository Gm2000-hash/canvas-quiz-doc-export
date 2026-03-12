import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Lightbulb } from "lucide-react";
import sketchCanvas from "@/assets/sketch-canvas-export.png";
import sketchQuestionBank from "@/assets/sketch-question-bank.png";
import sketchLessonPlanner from "@/assets/sketch-lesson-planner.png";
import sketchCreateQuestion from "@/assets/sketch-create-question.png";

const dailyTips = [
  { text: "The best teachers don't give you the answer — they spark the desire to find it.", author: "Unknown" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
  { text: "Every student can learn, just not on the same day or in the same way.", author: "George Evans" },
  { text: "Teaching is the one profession that creates all other professions.", author: "Unknown" },
  { text: "Try a 'think-pair-share' today — give students 30 seconds to think, 1 minute to discuss with a partner, then share out.", author: "Tip" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Start class with a surprising fact related to today's lesson — curiosity is the best hook.", author: "Tip" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
  { text: "Use exit tickets to check understanding before students leave — even one question reveals a lot.", author: "Tip" },
  { text: "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.", author: "Brad Henry" },
  { text: "Try the 'muddiest point' strategy: ask students to write down what confused them most today.", author: "Tip" },
  { text: "In learning you will teach, and in teaching you will learn.", author: "Phil Collins" },
  { text: "Give wait time after asking a question — 3 to 5 seconds of silence leads to deeper answers.", author: "Tip" },
  { text: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren" },
  { text: "Celebrate small wins — acknowledge effort as much as achievement.", author: "Tip" },
  { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
  { text: "Try a gallery walk: post student work around the room and let peers leave feedback on sticky notes.", author: "Tip" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "Use sentence starters to scaffold discussions for reluctant speakers.", author: "Tip" },
  { text: "Children must be taught how to think, not what to think.", author: "Margaret Mead" },
  { text: "Revisit a concept from last week with a quick warm-up — spaced retrieval builds lasting memory.", author: "Tip" },
  { text: "The task of the modern educator is not to cut down jungles, but to irrigate deserts.", author: "C.S. Lewis" },
  { text: "Try 'cold calling' with popsicle sticks — it keeps every student engaged and ready.", author: "Tip" },
  { text: "One child, one teacher, one book, one pen can change the world.", author: "Malala Yousafzai" },
  { text: "Anchor charts aren't just decoration — they're reference tools. Point to them often.", author: "Tip" },
  { text: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein" },
  { text: "Use 'two stars and a wish' for peer feedback: two things done well and one area to improve.", author: "Tip" },
  { text: "The influence of a good teacher can never be erased.", author: "Unknown" },
  { text: "Model your thinking out loud — students need to see how experts approach problems.", author: "Tip" },
  { text: "Education breeds confidence. Confidence breeds hope. Hope breeds peace.", author: "Confucius" },
  { text: "End class with a one-sentence summary: 'Today I learned that...' — it consolidates learning.", author: "Tip" },
];

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

  const todayTip = useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return dailyTips[dayOfYear % dailyTips.length];
  }, []);

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

        <div className="mb-8 mx-auto max-w-lg rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {todayTip.author === "Tip" ? "Daily Teaching Tip" : "Daily Inspiration"}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed italic">"{todayTip.text}"</p>
          {todayTip.author !== "Tip" && (
            <p className="text-xs text-muted-foreground mt-2">— {todayTip.author}</p>
          )}
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
