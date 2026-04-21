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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <StickyNote className="h-7 w-7 text-primary" />
            Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your personal knowledge base. Nest pages, link them with [[wiki-links]], tag them with #tags.
          </p>
        </div>
        <Button onClick={handleNew} disabled={createNote.isPending} className="gap-2">
          <Plus className="h-4 w-4" /> New page
        </Button>
      </div>

      {recent.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any notes yet.
            </p>
            <Button onClick={handleNew} disabled={createNote.isPending} className="gap-2">
              <Plus className="h-4 w-4" /> Create your first note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Recent
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate(`/notes/${n.id}`)}
                className="text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-4"
              >
                <div className="text-2xl mb-2">{n.icon || "📝"}</div>
                <div className="font-medium text-sm truncate">{n.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground mt-1">
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
