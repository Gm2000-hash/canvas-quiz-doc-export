// Types for the Canva-style free-positioning page editor.
// Stored in the public.canvas_layouts table (one row per user+route).

export type CanvasElementType =
  | "image"
  | "text"
  | "heading"
  | "divider"
  | "spacer"
  | "embed";

export type ImageFilters = {
  blur?: number;        // 0-20 px
  brightness?: number;  // 0-2
  contrast?: number;    // 0-2
  saturate?: number;    // 0-2
  grayscale?: number;   // 0-1
  sepia?: number;       // 0-1
};

export type CropRect = {
  x: number;       // % of source image (0-100)
  y: number;
  width: number;
  height: number;
};

export type CanvasElement = {
  id: string;
  type: CanvasElementType;
  // Layout — coordinates are % of the editing surface
  x: number;
  y: number;
  width: number;        // %
  height: number;       // %  (auto for text-like, explicit for images/embeds/spacers)
  rotation: number;     // degrees
  zIndex: number;
  hidden?: boolean;
  // Text / heading
  content?: string;
  level?: 1 | 2 | 3 | 4;
  align?: "left" | "center" | "right";
  color?: string;
  bg?: string;
  fontSize?: number;    // px
  bold?: boolean;
  italic?: boolean;
  // Image
  src?: string;
  opacity?: number;     // 0-1
  filters?: ImageFilters;
  flipH?: boolean;
  flipV?: boolean;
  crop?: CropRect | null;
  // Spacer
  height_px?: number;
};

export const DEFAULT_FILTERS: Required<ImageFilters> = {
  blur: 0,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  grayscale: 0,
  sepia: 0,
};

export function buildFilterString(f: ImageFilters | undefined): string {
  const m = { ...DEFAULT_FILTERS, ...(f || {}) };
  return [
    `blur(${m.blur}px)`,
    `brightness(${m.brightness})`,
    `contrast(${m.contrast})`,
    `saturate(${m.saturate})`,
    `grayscale(${m.grayscale})`,
    `sepia(${m.sepia})`,
  ].join(" ");
}

export function buildTransform(el: Pick<CanvasElement, "rotation" | "flipH" | "flipV">): string {
  const parts: string[] = [];
  if (el.rotation) parts.push(`rotate(${el.rotation}deg)`);
  const sx = el.flipH ? -1 : 1;
  const sy = el.flipV ? -1 : 1;
  if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
  return parts.join(" ");
}

let _seq = 0;
export function newElementId(): string {
  return `el_${Date.now().toString(36)}_${(_seq++).toString(36)}`;
}

export function defaultElement(type: CanvasElementType, zIndex: number): CanvasElement {
  const base: CanvasElement = {
    id: newElementId(),
    type,
    x: 20,
    y: 20,
    width: 40,
    height: 20,
    rotation: 0,
    zIndex,
  };
  switch (type) {
    case "image":
      return { ...base, width: 30, height: 30, opacity: 1, filters: { ...DEFAULT_FILTERS }, src: "" };
    case "text":
      return { ...base, width: 30, height: 8, content: "Text", fontSize: 16, align: "left", color: "" };
    case "heading":
      return { ...base, width: 50, height: 10, content: "Heading", level: 2, fontSize: 32, bold: true, align: "left" };
    case "divider":
      return { ...base, width: 60, height: 1, color: "" };
    case "spacer":
      return { ...base, width: 30, height: 4, height_px: 32 };
    case "embed":
      return { ...base, width: 50, height: 30, content: "" };
  }
}
