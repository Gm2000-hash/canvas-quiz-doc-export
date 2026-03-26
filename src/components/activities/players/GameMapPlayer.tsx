import type { GameMapContent } from "@/lib/h5p-types";

interface Props { content: GameMapContent; }

export function GameMapPlayer({ content }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
      <p className="text-lg font-semibold">{content.title}</p>
      <p className="text-sm text-muted-foreground mt-2">Game Map interactive player coming soon.</p>
      <p className="text-xs text-muted-foreground mt-1">{content.stages.length} stages configured</p>
    </div>
  );
}
