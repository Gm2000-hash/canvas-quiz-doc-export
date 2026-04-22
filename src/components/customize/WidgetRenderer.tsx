import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { CustomWidget } from "@/lib/customization-types";

function WidgetView({ w }: { w: CustomWidget }) {
  const style: React.CSSProperties = {
    color: w.color,
    background: w.bg,
    width: w.width,
    textAlign: w.align,
  };
  switch (w.type) {
    case "heading": {
      const Tag = (`h${w.level || 2}`) as "h1" | "h2" | "h3" | "h4";
      return <Tag style={style} className="font-bold">{w.content || "Heading"}</Tag>;
    }
    case "text":
      return <p style={style} className="whitespace-pre-wrap leading-relaxed">{w.content || ""}</p>;
    case "image":
      return w.content
        ? <img src={w.content} alt="" style={style} className="rounded-lg max-w-full h-auto" />
        : <div className="text-sm text-muted-foreground">No image URL</div>;
    case "divider":
      return <hr style={{ borderColor: w.color }} className="my-2" />;
    case "spacer":
      return <div style={{ height: `${w.height || 24}px`, background: w.bg }} />;
    case "embed":
      return w.content
        ? <iframe src={w.content} style={style} className="w-full aspect-video rounded-lg border border-border" allowFullScreen />
        : <div className="text-sm text-muted-foreground">No embed URL</div>;
  }
}

/**
 * Renders all widgets configured for the current page.
 * Drop <PageWidgets /> wherever you want widgets to appear (typically just inside the main content area).
 */
export function PageWidgets() {
  const { editMode, getPageWidgets, deleteWidget } = useTheme();
  const widgets = getPageWidgets();
  if (widgets.length === 0) return null;
  return (
    <div className="space-y-3 my-4">
      {widgets.map(w => (
        <div key={w.id} className="tk-widget relative group">
          <WidgetView w={w} />
          {editMode && (
            <Button
              size="sm" variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100"
              onClick={() => deleteWidget(w.id)}
              title="Delete widget"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
