import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CoursePresentationContent } from "@/lib/h5p-types";

interface Props { content: CoursePresentationContent; }

export function CoursePresentationPlayer({ content }: Props) {
  const [idx, setIdx] = useState(0);
  const slide = content.slides[idx];
  if (!slide) return <p className="text-sm text-muted-foreground">No slides.</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-border bg-card min-h-[250px] p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-foreground mb-4">{slide.title}</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap max-w-lg leading-relaxed">{slide.content}</p>
      </div>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">{idx + 1} / {content.slides.length}</span>
        <Button size="sm" variant="outline" disabled={idx === content.slides.length - 1} onClick={() => setIdx(i => i + 1)}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      {slide.notes && (
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground"><strong>Notes:</strong> {slide.notes}</p>
        </div>
      )}
    </div>
  );
}
