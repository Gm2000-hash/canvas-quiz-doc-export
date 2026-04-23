import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useProfile, SUBJECT_OPTIONS } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowUpRight,
  Lightbulb,
  FileText,
  BookOpen,
  Layers,
  Library,
  Puzzle,
  BookOpenCheck,
  StickyNote,
  Download,
} from "lucide-react";
import sketchLessonPlanner from "@/assets/sketch-lesson-planner.png";
import sketchQuestionBank from "@/assets/sketch-question-bank.png";
import sketchActivityBuilder from "@/assets/sketch-activity-builder.png";

const dailyTips = [
  { text: "The best teachers don't give you the answer — they spark the desire to find it.", author: "Unknown" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
  { text: "Every student can learn, just not on the same day or in the same way.", author: "George Evans" },
  { text: "Teaching is the one profession that creates all other professions.", author: "Unknown" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
  { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
  { text: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren" },
  { text: "Children must be taught how to think, not what to think.", author: "Margaret Mead" },
  { text: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein" },
];

const TOOLKIT = [
  { label: "Curriculum", path: "/lesson-planner", icon: Layers },
  { label: "Question Bank", path: "/question-bank", icon: BookOpen },
  { label: "Activities", path: "/activities", icon: Puzzle },
  { label: "Standards", path: "/standards", icon: Library },
  { label: "Reading Library", path: "/reading-library", icon: BookOpenCheck },
  { label: "Canvas Export", path: "/canvas", icon: FileText },
  { label: "Notes", path: "/notes", icon: StickyNote },
];

const PILLARS = [
  { n: "01.", title: "Build Curriculum", desc: "Units, lessons, pacing — all in one place." },
  { n: "02.", title: "Bank Questions", desc: "NGSS / Idaho-tagged assessments at your fingertips." },
  { n: "03.", title: "Create Activities", desc: "H5P-style interactives students actually finish." },
  { n: "04.", title: "Export to Canvas", desc: "One-click LMS sync — quizzes, scores, embeds." },
];

export default function Home() {
  usePageTitle("Home");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [questionCount, setQuestionCount] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);
  const [unitCount, setUnitCount] = useState(0);
  const [todayLessons, setTodayLessons] = useState<{ id: string; title: string }[]>([]);
  const [recentUnits, setRecentUnits] = useState<
    { id: string; title: string; discipline: string | null; grade_level: string | null; created_at: string }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const fetchData = async () => {
      const [qRes, lRes, uRes, tlRes, ruRes] = await Promise.all([
        supabase.from("question_bank").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("lesson_plans").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("units").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("lesson_plans").select("id, title").eq("user_id", user.id).eq("lesson_date", today),
        supabase
          .from("units")
          .select("id, title, discipline, grade_level, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      setQuestionCount(qRes.count ?? 0);
      setLessonCount(lRes.count ?? 0);
      setUnitCount(uRes.count ?? 0);
      setTodayLessons(tlRes.data ?? []);
      setRecentUnits((ruRes.data as any[]) ?? []);
    };
    fetchData();
  }, [user]);

  const todayTip = useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return dailyTips[dayOfYear % dailyTips.length];
  }, []);

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "TK";

  const subjectLabels = (profile?.subjects || []).map((s) => {
    const opt = SUBJECT_OPTIONS.find((o) => o.value === s);
    return opt?.label || s;
  });

  const gradeLabels = ((profile as any)?.grade_levels || []).map((g: string) => `Grade ${g}`);

  const aboutSentence = (() => {
    const parts: string[] = [];
    if (subjectLabels.length) parts.push(subjectLabels.join(", "));
    if (gradeLabels.length) parts.push(gradeLabels.join(" · "));
    return parts.length
      ? `Currently teaching ${parts.join(" — ")}. ${unitCount} units, ${lessonCount} lessons, ${questionCount} questions in the bank.`
      : `${unitCount} units, ${lessonCount} lessons, and ${questionCount} questions across your toolkit.`;
  })();

  const heroFeatureImg = useMemo(() => {
    const imgs = [sketchLessonPlanner, sketchQuestionBank, sketchActivityBuilder];
    const day = new Date().getDate();
    return imgs[day % imgs.length];
  }, []);

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-8 max-w-[1400px] mx-auto w-full space-y-12">
      {/* ===== BENTO GRID ===== */}
      <section className="grid grid-cols-12 gap-4 md:gap-5 auto-rows-min">
        {/* HERO TILE — cols 1-7 */}
        <div className="col-span-12 lg:col-span-7 bento-tile relative overflow-hidden min-h-[420px] flex flex-col justify-between bg-gradient-to-br from-neutral-100 to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || "Teacher"}
                  className="h-14 w-14 rounded-full object-cover border border-neutral-200"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-lg">
                  {initials}
                </div>
              )}
              <div>
                <p className="eyebrow">Teacher</p>
                <p className="text-sm font-semibold">{profile?.display_name || "Welcome"}</p>
              </div>
            </div>
            <span className="eyebrow">Dashboard</span>
          </div>

          <div className="mt-10">
            <h1 className="display-xl">
              Plan lessons<br />
              students actually<br />
              <span className="italic font-light">remember.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-lg">
              Your full teaching toolkit — curriculum, assessments, activities and Canvas export — all in one quiet, focused workspace.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <button onClick={() => navigate("/lesson-planner")} className="pill-btn pill-btn--ink">
              View Curriculum <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => navigate("/question-bank")} className="pill-btn">
              Question Bank
            </button>
          </div>
        </div>

        {/* ABOUT TILE — cols 8-12 */}
        <div className="col-span-12 sm:col-span-7 lg:col-span-5 bento-tile bento-tile--white min-h-[420px] flex flex-col">
          <p className="eyebrow">About</p>
          <h2 className="display-lg mt-3">
            Quiet tools.<br />
            Loud results.
          </h2>
          <p className="mt-6 text-muted-foreground leading-relaxed">{aboutSentence}</p>

          <div className="mt-auto flex items-center justify-between pt-8 gap-4 flex-wrap">
            <div className="flex gap-6">
              <button
                onClick={() => navigate("/lesson-planner")}
                className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 rounded-md"
                aria-label={`View ${unitCount} units`}
              >
                <p className="text-3xl font-extrabold leading-none group-hover:underline underline-offset-4 decoration-2">{unitCount}</p>
                <p className="eyebrow mt-1 inline-flex items-center gap-1">
                  Units <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </p>
              </button>
              <button
                onClick={() => navigate("/lesson-planner")}
                className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 rounded-md"
                aria-label={`View ${lessonCount} lessons`}
              >
                <p className="text-3xl font-extrabold leading-none group-hover:underline underline-offset-4 decoration-2">{lessonCount}</p>
                <p className="eyebrow mt-1 inline-flex items-center gap-1">
                  Lessons <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </p>
              </button>
              <button
                onClick={() => navigate("/question-bank")}
                className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 rounded-md"
                aria-label={`View ${questionCount} questions`}
              >
                <p className="text-3xl font-extrabold leading-none group-hover:underline underline-offset-4 decoration-2">{questionCount}</p>
                <p className="eyebrow mt-1 inline-flex items-center gap-1">
                  Questions <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </p>
              </button>
            </div>
            <button onClick={() => navigate("/lesson-planner")} className="pill-btn">
              View My Work <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* CORAL ACCENT — full width on small, 5 cols below 7-col hero on large */}
        <div className="col-span-12 sm:col-span-5 lg:col-span-4 bento-tile bento-tile--coral min-h-[260px] flex flex-col justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-80">Today</p>
            <p className="display-lg mt-3">
              {todayLessons.length > 0
                ? `${todayLessons.length} lesson${todayLessons.length === 1 ? "" : "s"}`
                : "No lessons"}
            </p>
            {todayLessons.length > 0 ? (
              <ul className="mt-4 space-y-1.5">
                {todayLessons.slice(0, 3).map((l) => (
                  <li key={l.id} className="text-sm font-medium opacity-95 truncate">
                    · {l.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm opacity-90">Nothing scheduled for today. A clean slate.</p>
            )}
          </div>
          <button
            onClick={() => navigate(todayLessons[0] ? `/lesson-planner` : "/lesson-planner")}
            className="self-start mt-6 inline-flex items-center gap-2 rounded-full bg-white text-[#FF6B47] px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100 transition-colors"
            style={{ color: "#FF6B47" }}
          >
            <Download className="h-3.5 w-3.5" /> Open Planner
          </button>
        </div>

        {/* TOOLKIT TILE — cols 1-5 */}
        <div className="col-span-12 lg:col-span-5 bento-tile min-h-[260px]">
          <p className="eyebrow">Toolkit</p>
          <h3 className="display-lg mt-3">Everything you need.</h3>
          <div className="mt-6 flex flex-wrap gap-2">
            {TOOLKIT.map((t) => (
              <button key={t.path} onClick={() => navigate(t.path)} className="pill-btn">
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* FEATURE PREVIEW — cols 6-12 */}
        <div className="col-span-12 lg:col-span-7 bento-tile relative min-h-[260px] overflow-hidden flex items-center justify-center bg-gradient-to-br from-white to-neutral-100">
          <img
            src={heroFeatureImg}
            alt="Toolkit preview"
            className="max-h-[200px] object-contain opacity-95"
            loading="lazy"
          />
          {/* mini floating cards */}
          <div className="absolute top-5 left-5 rounded-2xl bg-white border border-neutral-200 shadow-sm px-3 py-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs font-semibold">Question Bank</span>
          </div>
          <div className="absolute bottom-5 right-5 rounded-2xl bg-foreground text-background px-3 py-2 flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            <span className="text-xs font-semibold">Activities</span>
          </div>
          <div className="absolute bottom-5 left-5 rounded-2xl bg-white border border-neutral-200 shadow-sm px-3 py-2 flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4" />
            <span className="text-xs font-semibold">Reading</span>
          </div>
        </div>
      </section>

      {/* ===== RECENT WORK ===== */}
      {recentUnits.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-6">
            <p className="eyebrow">Recent Work</p>
            <button onClick={() => navigate("/lesson-planner")} className="pill-btn">
              See all <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {recentUnits.map((u) => (
              <div key={u.id} className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-sm">
                  {u.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{u.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[u.discipline, u.grade_level && `Grade ${u.grade_level}`, new Date(u.created_at).getFullYear()]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button onClick={() => navigate(`/units/${u.id}`)} className="pill-btn">
                  View <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== WHAT THIS APP DOES ===== */}
      <section>
        <p className="eyebrow mb-6">What This App Does</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((p) => (
            <div key={p.n} className="border-t border-border pt-5">
              <p className="text-5xl font-extrabold text-neutral-200 leading-none">{p.n}</p>
              <h4 className="mt-4 text-lg font-bold">{p.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DAILY TIP / FOOTER ABOUT ===== */}
      <section className="bento-tile flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <p className="eyebrow">{todayTip.author === "Tip" ? "Daily Tip" : "Daily Inspiration"}</p>
            <p className="mt-2 text-lg italic leading-relaxed">"{todayTip.text}"</p>
            {todayTip.author !== "Tip" && (
              <p className="text-sm text-muted-foreground mt-2">— {todayTip.author}</p>
            )}
          </div>
        </div>
        <button onClick={() => navigate("/profile")} className="pill-btn pill-btn--ink shrink-0">
          Learn More <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </section>
    </div>
  );
}
