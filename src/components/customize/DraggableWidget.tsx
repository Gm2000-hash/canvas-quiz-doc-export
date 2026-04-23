import { useRef } from "react";
import type { CanvasElement } from "@/lib/canvas-types";
import { buildTransform } from "@/lib/canvas-types";
import { ElementContent } from "./CanvasOverlay";
import { cn } from "@/lib/utils";

type Props = {
  element: CanvasElement;
  containerSize: { w: number; h: number };
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
};

const HANDLES = [
  { key: "nw", cursor: "nwse-resize", x: 0,   y: 0   },
  { key: "n",  cursor: "ns-resize",   x: 0.5, y: 0   },
  { key: "ne", cursor: "nesw-resize", x: 1,   y: 0   },
  { key: "e",  cursor: "ew-resize",   x: 1,   y: 0.5 },
  { key: "se", cursor: "nwse-resize", x: 1,   y: 1   },
  { key: "s",  cursor: "ns-resize",   x: 0.5, y: 1   },
  { key: "sw", cursor: "nesw-resize", x: 0,   y: 1   },
  { key: "w",  cursor: "ew-resize",   x: 0,   y: 0.5 },
] as const;

export function DraggableWidget({ element, containerSize, selected, onSelect, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    if ((e.target as HTMLElement).dataset.handle) return; // resize handle handles its own drag
    if ((e.target as HTMLElement).dataset.rotate) return;
    const startX = e.clientX, startY = e.clientY;
    const startEx = element.x, startEy = element.y;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / Math.max(containerSize.w, 1)) * 100;
      const dyPct = ((ev.clientY - startY) / Math.max(containerSize.h, 1)) * 100;
      onChange({
        x: clamp(startEx + dxPct, -50, 150),
        y: Math.max(0, startEy + dyPct),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (handleKey: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const start = { x: element.x, y: element.y, w: element.width, h: element.height };
    const move = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / Math.max(containerSize.w, 1)) * 100;
      const dyPct = ((ev.clientY - startY) / Math.max(containerSize.h, 1)) * 100;
      const next: Partial<CanvasElement> = {};
      if (handleKey.includes("e")) next.width = Math.max(2, start.w + dxPct);
      if (handleKey.includes("s")) next.height = Math.max(1, start.h + dyPct);
      if (handleKey.includes("w")) {
        next.width = Math.max(2, start.w - dxPct);
        next.x = start.x + dxPct;
      }
      if (handleKey.includes("n")) {
        next.height = Math.max(1, start.h - dyPct);
        next.y = start.y + dyPct;
      }
      onChange(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const startRot = element.rotation || 0;
    const move = (ev: PointerEvent) => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
      onChange({ rotation: Math.round(startRot + (a - startAngle)) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // For autoflow elements (text/heading/divider), height in % is just a hint — we let content size drive it.
  const explicitHeight = element.type === "image" || element.type === "embed" || element.type === "spacer";

  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: explicitHeight ? `${element.height}%` : undefined,
    zIndex: element.zIndex,
    transform: buildTransform(element),
    transformOrigin: "center center",
    cursor: "move",
  };

  return (
    <div
      ref={wrapRef}
      style={wrapStyle}
      className={cn("tk-canvas-widget group", selected && "tk-selected")}
      onPointerDown={startDrag}
    >
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-colors rounded-md",
        selected ? "ring-2 ring-primary" : "ring-1 ring-transparent group-hover:ring-primary/50"
      )} />
      <ElementContent element={element} />

      {selected && (
        <>
          {/* Rotation handle */}
          <div
            data-rotate="true"
            onPointerDown={startRotate}
            className="absolute left-1/2 -top-8 -translate-x-1/2 h-5 w-5 rounded-full bg-primary border-2 border-background shadow cursor-grab"
            title="Rotate"
          />
          <div className="absolute left-1/2 -top-3 -translate-x-1/2 h-3 w-px bg-primary pointer-events-none" />
          {/* 8 resize handles */}
          {HANDLES.map(h => (
            <div
              key={h.key}
              data-handle={h.key}
              onPointerDown={startResize(h.key)}
              style={{
                position: "absolute",
                left: `${h.x * 100}%`,
                top: `${h.y * 100}%`,
                transform: "translate(-50%, -50%)",
                cursor: h.cursor,
              }}
              className="h-3 w-3 rounded-sm bg-background border-2 border-primary shadow"
            />
          ))}
        </>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
