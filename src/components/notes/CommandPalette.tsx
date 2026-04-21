import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearchNotes } from "@/hooks/useNotes";
import {
  FileText, Home, BookOpen, Layers, Puzzle, Library, BookOpenCheck,
  BarChart3, ClipboardCheck, Brain,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOOLS = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Question Bank", path: "/question-bank", icon: BookOpen },
  { label: "Curriculum", path: "/lesson-planner", icon: Layers },
  { label: "Activities", path: "/activities", icon: Puzzle },
  { label: "Reading Library", path: "/reading-library", icon: BookOpenCheck },
  { label: "Canvas Export", path: "/canvas", icon: FileText },
  { label: "Canvas Results", path: "/canvas-results", icon: BarChart3 },
  { label: "Quiz Analytics", path: "/quiz-analytics", icon: BarChart3 },
  { label: "Standards Browser", path: "/standards", icon: Library },
  { label: "ISAT Practice", path: "/lesson-planner", icon: ClipboardCheck },
  { label: "Stress Navigator", path: "/stress-navigator", icon: Brain },
  { label: "All Notes", path: "/notes", icon: FileText },
];

export function CommandPalette({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: results = [] } = useSearchNotes(query);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search notes and tools…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Notes">
            {results.map((n: any) => (
              <CommandItem
                key={n.id}
                value={`note-${n.id}-${n.title}`}
                onSelect={() => go(`/notes/${n.id}`)}
              >
                <span className="text-base mr-2 w-5 text-center">
                  {n.icon || <FileText className="h-4 w-4 inline" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{n.title || "Untitled"}</div>
                  {n.content_text && (
                    <div className="text-xs text-muted-foreground truncate">
                      {n.content_text.slice(0, 80)}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Tools">
          {TOOLS.map((t) => (
            <CommandItem
              key={t.path + t.label}
              value={`tool-${t.label}`}
              onSelect={() => go(t.path)}
            >
              <t.icon className="h-4 w-4 mr-2" />
              <span>{t.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
