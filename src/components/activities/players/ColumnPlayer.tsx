import type { ColumnContent } from "@/lib/h5p-types";

interface Props { content: ColumnContent; }

export function ColumnPlayer({ content }: Props) {
  return (
    <div className="space-y-6">
      {content.sections.map((s) => (
        <div key={s.id} className="space-y-2">
          {s.title && <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{s.content}</p>
        </div>
      ))}
    </div>
  );
}
