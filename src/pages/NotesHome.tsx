import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useNotesTree, useCreateNote } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Plus, FileText, StickyNote } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { NoteTreeItem } from "@/hooks/useNotes";

const TINTS = [
  "bubble-tint-green",
  "bubble-tint-cyan",
  "bubble-tint-pink",
  "bubble-tint-orange",
  "bubble-tint-purple",
  "bubble-tint-yellow",
];

type Bucket = {
  key: string;
  label: string;
  notes: NoteTreeItem[];
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // Monday-start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function bucketize(notes: NoteTreeItem[]): Bucket[] {
  const now = new Date();
  const wk = startOfWeek(now).getTime();
  const mo = startOfMonth(now).getTime();
  const yr = startOfYear(now).getTime();

  const buckets: Record<string, Bucket> = {
    week:  { key: "week",  label: "This week",  notes: [] },
    month: { key: "month", label: "This month", notes: [] },
    year:  { key: "year",  label: "This year",  notes: [] },
    older: { key: "older", label: "Older",      notes: [] },
  };

  // Per-year sub-buckets for "older"
  const olderByYear: Record<number, NoteTreeItem[]> = {};

  const sorted = [...notes].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  for (const n of sorted) {
    const t = new Date(n.updated_at).getTime();
    if (t >= wk) buckets.week.notes.push(n);
    else if (t >= mo) buckets.month.notes.push(n);
    else if (t >= yr) buckets.year.notes.push(n);
    else {
      const y = new Date(n.updated_at).getFullYear();
      (olderByYear[y] = olderByYear[y] || []).push(n);
    }
  }

  const out: Bucket[] = [];
  if (buckets.week.notes.length)  out.push(buckets.week);
  if (buckets.month.notes.length) out.push(buckets.month);
  if (buckets.year.notes.length)  out.push(buckets.year);
  Object.keys(olderByYear)
    .map(Number)
    .sort((a, b) => b - a)
    .forEach((y) => out.push({ key: `y-${y}`, label: String(y), notes: olderByYear[y] }));

  return out;
}

export default function NotesHome() {
  usePageTitle("Notes");
  const navigate = useNavigate();
  const { data: notes = [] } = useNotesTree();
  const createNote = useCreateNote();

  const buckets = useMemo(() => bucketize(notes), [notes]);

  const handleNew = async () => {
    try {
      const n = await createNote.mutateAsync({});
      navigate(`/notes/${n.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create");
    }
  };

  let cardIndex = 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl bubble-glass bubble-tint-yellow flex items-center justify-center">
              <StickyNote className="h-6 w-6 text-amber-600" />
            </span>
            Notes
          </h1>
          <p className="text-base text-muted-foreground mt-2 max-w-xl">
            Your personal knowledge base. Sorted by week, month, and year. Use{" "}
            <code className="px-1.5 py-0.5 rounded bg-white/70 border border-white/80 text-sm">[[wiki-links]]</code>{" "}
            and <code className="px-1.5 py-0.5 rounded bg-white/70 border border-white/80 text-sm">#tags</code> to organize.
          </p>
        </div>
        <Button onClick={handleNew} disabled={createNote.isPending} size="lg" className="gap-2 rounded-full shadow-md">
          <Plus className="h-5 w-5" /> New page
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="bubble-glass bubble-tint-cyan py-16 px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/70 mx-auto mb-4 flex items-center justify-center shadow-sm">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <p className="text-base text-foreground mb-5">
            You don't have any notes yet.
          </p>
          <Button onClick={handleNew} disabled={createNote.isPending} size="lg" className="gap-2 rounded-full">
            <Plus className="h-5 w-5" /> Create your first note
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {buckets.map((b) => (
            <section key={b.key} data-section={`notes.bucket.${b.key}`}>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  {b.label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {b.notes.length} {b.notes.length === 1 ? "note" : "notes"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {b.notes.map((n) => {
                  const tint = TINTS[cardIndex++ % TINTS.length];
                  return (
                    <button
                      key={n.id}
                      onClick={() => navigate(`/notes/${n.id}`)}
                      className={`text-left bubble-glass ${tint} p-5`}
                    >
                      <div className="text-3xl mb-3">{n.icon || "📝"}</div>
                      <div className="font-semibold text-base truncate text-foreground">
                        {n.title || "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5">
                        Updated {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
