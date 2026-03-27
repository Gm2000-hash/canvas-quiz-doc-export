import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { PageBanner } from "@/components/PageBanner";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useProfile, SUBJECT_OPTIONS } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Lightbulb, FileText, BookOpen, Layers,
  Library, GripVertical, ArrowRight, Puzzle, BookOpenCheck,
} from "lucide-react";
import { DashboardAnalytics } from "@/components/DashboardAnalytics";
import sketchCanvas from "@/assets/sketch-canvas-export.png";
import sketchQuestionBank from "@/assets/sketch-question-bank.png";
import sketchLessonPlanner from "@/assets/sketch-lesson-planner.png";
import sketchStandardsBrowser from "@/assets/sketch-standards-browser.png";
import sketchActivityBuilder from "@/assets/sketch-activity-builder.png";

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

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  image?: string;
}

const ALL_CARDS: DashboardCard[] = [
  { id: "canvas", title: "Canvas Export", description: "Connect to Canvas LMS and export quizzes as formatted Word documents.", path: "/canvas", icon: FileText, image: sketchCanvas },
  { id: "lesson-planner", title: "Curriculum", description: "Build units, lessons, readings, and pacing guides for your courses.", path: "/lesson-planner", icon: Layers, image: sketchLessonPlanner },
  { id: "question-bank", title: "Question Bank", description: "Browse, search, and manage your library of assessment questions.", path: "/question-bank", icon: BookOpen, image: sketchQuestionBank },
  { id: "activities", title: "Activity Builder", description: "Create interactive H5P-style activities like fill-in-the-blanks and timelines.", path: "/activities", icon: Puzzle, image: sketchActivityBuilder },
  { id: "standards", title: "Standards Browser", description: "Browse Idaho and NGSS standards organized by subject, grade, and category.", path: "/standards", icon: Library, image: sketchStandardsBrowser },
  { id: "reading-library", title: "Reading Library", description: "Access shared curriculum readings and PDF resources for your classes.", path: "/reading-library", icon: BookOpenCheck },
];

const STORAGE_KEY = "dashboard-card-order";

function getStoredOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function storeOrder(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function orderCards(cards: DashboardCard[]): DashboardCard[] {
  const stored = getStoredOrder();
  if (!stored) return cards;
  const map = new Map(cards.map(c => [c.id, c]));
  const ordered: DashboardCard[] = [];
  for (const id of stored) {
    const card = map.get(id);
    if (card) { ordered.push(card); map.delete(id); }
  }
  // append any new cards not in stored order
  map.forEach(c => ordered.push(c));
  return ordered;
}

export default function Home() {
  usePageTitle("Home");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [cards, setCards] = useState(() => orderCards(ALL_CARDS));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);
  const [unitCount, setUnitCount] = useState(0);
  const [todayLessons, setTodayLessons] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const fetchData = async () => {
      const [qRes, lRes, uRes, tlRes] = await Promise.all([
        supabase.from("question_bank").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("lesson_plans").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("units").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("lesson_plans").select("id, title").eq("user_id", user.id).eq("lesson_date", today),
      ]);
      setQuestionCount(qRes.count ?? 0);
      setLessonCount(lRes.count ?? 0);
      setUnitCount(uRes.count ?? 0);
      setTodayLessons(tlRes.data ?? []);
    };
    fetchData();
  }, [user]);

  const todayTip = useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return dailyTips[dayOfYear % dailyTips.length];
  }, []);

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    dragNode.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      setCards(prev => {
        const reordered = [...prev];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(overIdx, 0, moved);
        storeOrder(reordered.map(c => c.id));
        return reordered;
      });
    }
    setDragIdx(null);
    setOverIdx(null);
    dragNode.current = null;
  }, [dragIdx, overIdx]);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  const subjectLabels = (profile?.subjects || []).map(s => {
    const opt = SUBJECT_OPTIONS.find(o => o.value === s);
    return opt?.label || s;
  });

  const gradeLabels = ((profile as any)?.grade_levels || []).map((g: string) => `Grade ${g}`);

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

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8 font-sans font-medium text-left text-3xl bg-muted-foreground text-sidebar-foreground text-[#27fc91]">
        {/* Welcome Banner */}
        <PageBanner
          greeting={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}${profile?.display_name ? `, ${profile.display_name}` : ""}`}
          subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          avatarUrl={(profile as any)?.avatar_url || ""}
          avatarFallback={initials}
          avatarPosition="right"
          avatarSize="large"
        >
          {/* Today's Lessons */}
          {todayLessons.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Today's Lessons:</span>
              {todayLessons.map(l => (
                <Badge key={l.id} variant="secondary" className="rounded-lg text-xs">
                  {l.title}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No lessons scheduled for today</p>
          )}
        </PageBanner>

        {/* Draggable Dashboard Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Dashboard</h2>
            <p className="text-xs text-muted-foreground">Drag to rearrange</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  className={`group relative rounded-2xl border bg-card/60 backdrop-blur-sm text-left transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 cursor-grab active:cursor-grabbing ${
                    overIdx === idx && dragIdx !== null && dragIdx !== idx
                      ? "ring-2 ring-primary/40 border-primary/40"
                      : "border-border/60"
                  }`}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <button
                    onClick={() => navigate(card.path)}
                    className="w-full p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 h-14 w-14 rounded-xl bg-primary/15 flex items-center justify-center overflow-hidden">
                        {card.image ? (
                          <img
                            src={card.image}
                            alt={card.title}
                            className="h-10 w-10 object-contain transition-transform duration-200 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <Icon className="h-6 w-6 text-primary transition-transform duration-200 group-hover:scale-110" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analytics Widgets */}
        {user && <DashboardAnalytics userId={user.id} />}

        {/* Daily Tip */}
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-neon-yellow" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neon-yellow">
              {todayTip.author === "Tip" ? "Daily Teaching Tip" : "Daily Inspiration"}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed italic">"{todayTip.text}"</p>
          {todayTip.author !== "Tip" && (
            <p className="text-xs text-muted-foreground mt-2">— {todayTip.author}</p>
          )}
        </div>
      </main>
    </div>
  );
}
