import { useNavigate } from "react-router-dom";
import { useNotesTree, useCreateNote } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText, StickyNote } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function NotesHome() {
  usePageTitle("Notes");
  const navigate = useNavigate();
  const { data: notes = [] } = useNotesTree();
  const createNote = useCreateNote();

  const handleNew = async () => {
    try {
      const n = await createNote.mutateAsync({});
      navigate(`/notes/${n.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create");
    }
  };

  const recent = [...notes]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 12);

  const tints = ["bubble-tint-green", "bubble-tint-cyan", "bubble-tint-pink", "bubble-tint-orange", "bubble-tint-purple", "bubble-tint-yellow"];

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
            Your personal knowledge base. Nest pages, link them with <code className="px-1.5 py-0.5 rounded bg-white/70 border border-white/80 text-sm">[[wiki-links]]</code>, tag with <code className="px-1.5 py-0.5 rounded bg-white/70 border border-white/80 text-sm">#tags</code>.
          </p>
        </div>
        <Button onClick={handleNew} disabled={createNote.isPending} size="lg" className="gap-2 rounded-full shadow-md">
          <Plus className="h-5 w-5" /> New page
        </Button>
      </div>

      {recent.length === 0 ? (
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
        <>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
            Recent
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.map((n, i) => (
              <button
                key={n.id}
                onClick={() => navigate(`/notes/${n.id}`)}
                className={`text-left bubble-glass ${tints[i % tints.length]} p-5`}
              >
                <div className="text-3xl mb-3">{n.icon || "📝"}</div>
                <div className="font-semibold text-base truncate text-foreground">{n.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  Updated {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
