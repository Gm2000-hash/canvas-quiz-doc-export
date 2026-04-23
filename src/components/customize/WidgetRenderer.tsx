import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { X, Lock, Unlock, RotateCw, Crop } from "lucide-react";
import type { CustomWidget } from "@/lib/customization-types";
import { useEffect, useRef, useState } from "react";
import { ImageCropDialog } from "./ImageCropDialog";

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
        ? <img src={w.content} alt="" style={style} className="rounded-lg max-w-full h-auto" draggable={false} />
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
 * Inline widgets render in the normal flow; floating widgets render absolutely over the main area.
 */
export function PageWidgets() {
  const { editMode, getPageWidgets, deleteWidget } = useTheme();
  const widgets = getPageWidgets();
  const inline = widgets.filter(w => !w.floating);
  const floating = widgets.filter(w => w.floating);

  return (
    <>
      {inline.length > 0 && (
        <div className="space-y-3 my-4">
          {inline.map(w => (
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
      )}
      {floating.length > 0 && <FloatingLayer widgets={floating} />}
    </>
  );
}

function FloatingLayer({ widgets }: { widgets: CustomWidget[] }) {
  return (
    // pointer-events-none on the layer so it doesn't trap clicks; widgets re-enable on themselves.
    <div className="pointer-events-none absolute inset-0 z-30" data-floating-layer>
      {widgets.map(w => (
        <FloatingWidget key={w.id} w={w} />
      ))}
    </div>
  );
}

type DragMode =
  | { type: "move"; startX: number; startY: number; origX: number; origY: number }
  | { type: "resize"; startX: number; startY: number; origW: number; origH: number; ratio: number; keepRatio: boolean }
  | { type: "rotate"; startAngle: number; origRotation: number; cx: number; cy: number };

function FloatingWidget({ w }: { w: CustomWidget }) {
  const { editMode, updateWidget, deleteWidget } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const x = w.x ?? 80;
  const y = w.y ?? 80;
  const width = w.w ?? 240;
  const height = w.h ?? 160;
  const rotation = w.rotation ?? 0;
  const zIndex = w.z ?? 50;
  const locked = !!w.locked;

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (drag.type === "move") {
        updateWidget(w.id, {
          x: Math.max(0, drag.origX + (e.clientX - drag.startX)),
          y: Math.max(0, drag.origY + (e.clientY - drag.startY)),
        });
      } else if (drag.type === "resize") {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        let nw = Math.max(40, drag.origW + dx);
        let nh = Math.max(40, drag.origH + dy);
        if (drag.keepRatio || e.shiftKey) {
          // preserve aspect using larger axis
          if (Math.abs(dx) > Math.abs(dy)) nh = nw / drag.ratio;
          else nw = nh * drag.ratio;
        }
        updateWidget(w.id, { w: Math.round(nw), h: Math.round(nh) });
      } else if (drag.type === "rotate") {
        const angle = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * (180 / Math.PI);
        const delta = angle - drag.startAngle;
        updateWidget(w.id, { rotation: Math.round(drag.origRotation + delta) });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, updateWidget, w.id]);

  const startMove = (e: React.PointerEvent) => {
    if (locked || !editMode) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
    });
  };
  const startResize = (e: React.PointerEvent, keepRatio: boolean) => {
    if (locked || !editMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({
      type: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origW: width,
      origH: height,
      ratio: width / height || 1,
      keepRatio,
    });
  };
  const startRotate = (e: React.PointerEvent) => {
    if (locked || !editMode || !ref.current) return;
    e.preventDefault();
    e.stopPropagation();
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    setDrag({ type: "rotate", startAngle, origRotation: rotation, cx, cy });
  };

  const interactive = editMode && !locked;

  return (
    <div
      ref={ref}
      className={`absolute pointer-events-auto select-none ${interactive ? "cursor-move" : ""} ${editMode ? "outline outline-2 outline-dashed outline-primary/40 hover:outline-primary" : ""}`}
      style={{
        left: x,
        top: y,
        width,
        height,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        zIndex,
      }}
      onPointerDown={startMove}
    >
      {/* content */}
      {w.type === "image" && w.content ? (
        <img
          src={w.content}
          alt=""
          className="w-full h-full object-contain rounded-md"
          draggable={false}
          style={{ background: w.bg }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/40 rounded-md">
          {w.type === "image" ? "No image" : <WidgetView w={w} />}
        </div>
      )}

      {editMode && (
        <>
          {/* Toolbar */}
          <div
            className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-popover border border-border rounded-md shadow-sm px-1 py-0.5"
            style={{ transform: `translateX(-50%) rotate(${-rotation}deg)`, transformOrigin: "center" }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="icon" variant="ghost" className="h-6 w-6"
              onClick={() => updateWidget(w.id, { locked: !locked })}
              title={locked ? "Unlock" : "Lock"}
            >
              {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </Button>
            <Button
              size="icon" variant="ghost" className="h-6 w-6"
              onPointerDown={startRotate}
              title="Rotate (drag)"
            >
              <RotateCw className="h-3 w-3" />
            </Button>
            {w.type === "image" && w.content && (
              <Button
                size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => setCropOpen(true)}
                title="Crop"
              >
                <Crop className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => deleteWidget(w.id)}
              title="Delete"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Resize handle bottom-right */}
          {!locked && (
            <div
              className="absolute -bottom-1.5 -right-1.5 h-4 w-4 bg-primary border-2 border-background rounded-sm cursor-nwse-resize"
              onPointerDown={(e) => startResize(e, false)}
              title="Resize (Shift = preserve ratio)"
            />
          )}
        </>
      )}
    </div>
  );
}
