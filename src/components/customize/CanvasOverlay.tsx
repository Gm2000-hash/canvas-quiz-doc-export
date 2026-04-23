import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import type { CanvasElement } from "@/lib/canvas-types";
import { buildFilterString, buildTransform } from "@/lib/canvas-types";
import { DraggableWidget } from "./DraggableWidget";

/**
 * Renders all canvas elements absolutely-positioned over the page content.
 * In edit mode, widgets are interactive (drag/resize/rotate). Otherwise read-only.
 */
export function CanvasOverlay() {
  const {
    editMode, canvasElements, updateCanvasElement, selectedWidgetId, setSelectedWidgetId,
  } = useTheme();

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (canvasElements.length === 0 && !editMode) return null;

  // Click on empty area deselects
  const onContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && editMode) setSelectedWidgetId(null);
  };

  return (
    <div
      ref={containerRef}
      className="canvas-overlay-host relative w-full"
      style={{
        // Reserve space so we don't overlap natural page content
        minHeight: editMode ? "60vh" : (canvasElements.length ? "auto" : 0),
        pointerEvents: editMode ? "auto" : "none",
      }}
      onClick={onContainerClick}
      data-themeable="canvas.overlay"
    >
      {canvasElements
        .filter(e => !e.hidden)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(el => (
          editMode ? (
            <DraggableWidget
              key={el.id}
              element={el}
              containerSize={size}
              selected={selectedWidgetId === el.id}
              onSelect={() => setSelectedWidgetId(el.id)}
              onChange={(patch) => updateCanvasElement(el.id, patch)}
            />
          ) : (
            <StaticElement key={el.id} element={el} />
          )
        ))}
    </div>
  );
}

function StaticElement({ element }: { element: CanvasElement }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    zIndex: element.zIndex,
    transform: buildTransform(element),
    transformOrigin: "center center",
    pointerEvents: "auto",
  };
  if (element.type === "image" || element.type === "embed" || element.type === "spacer") {
    style.height = `${element.height}%`;
  }
  return <div style={style}><ElementContent element={element} /></div>;
}

export function ElementContent({ element }: { element: CanvasElement }) {
  switch (element.type) {
    case "image": {
      if (!element.src) {
        return (
          <div className="w-full h-full rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        );
      }
      const cropStyle: React.CSSProperties = element.crop
        ? {
            objectFit: "none",
            objectPosition: `-${element.crop.x}% -${element.crop.y}%`,
            // Scale so the crop box fills the container
            width: `${(100 / Math.max(element.crop.width, 1)) * 100}%`,
            height: `${(100 / Math.max(element.crop.height, 1)) * 100}%`,
          }
        : { objectFit: "cover", width: "100%", height: "100%" };
      return (
        <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 8 }}>
          <img
            src={element.src}
            alt=""
            draggable={false}
            style={{
              ...cropStyle,
              opacity: element.opacity ?? 1,
              filter: buildFilterString(element.filters),
              display: "block",
            }}
          />
        </div>
      );
    }
    case "text": {
      const style: React.CSSProperties = {
        color: element.color || undefined,
        background: element.bg || undefined,
        textAlign: element.align || "left",
        fontSize: element.fontSize ? `${element.fontSize}px` : undefined,
        fontWeight: element.bold ? 700 : undefined,
        fontStyle: element.italic ? "italic" : undefined,
        whiteSpace: "pre-wrap",
        lineHeight: 1.4,
        padding: element.bg ? "8px 12px" : undefined,
        borderRadius: element.bg ? 6 : undefined,
        width: "100%",
      };
      return <div style={style}>{element.content || ""}</div>;
    }
    case "heading": {
      const Tag = (`h${element.level || 2}`) as "h1" | "h2" | "h3" | "h4";
      const style: React.CSSProperties = {
        color: element.color || undefined,
        background: element.bg || undefined,
        textAlign: element.align || "left",
        fontSize: element.fontSize ? `${element.fontSize}px` : undefined,
        fontWeight: element.bold === false ? 400 : 700,
        fontStyle: element.italic ? "italic" : undefined,
        margin: 0,
        padding: element.bg ? "8px 12px" : undefined,
        borderRadius: element.bg ? 6 : undefined,
        width: "100%",
      };
      return <Tag style={style}>{element.content || "Heading"}</Tag>;
    }
    case "divider":
      return <hr style={{ borderColor: element.color || undefined, width: "100%", margin: 0 }} />;
    case "spacer":
      return <div style={{ width: "100%", height: "100%", background: element.bg || "transparent" }} />;
    case "embed":
      return element.content ? (
        <iframe
          src={element.content}
          className="w-full h-full rounded-lg border border-border"
          allowFullScreen
        />
      ) : (
        <div className="w-full h-full rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
          No embed URL
        </div>
      );
  }
}
