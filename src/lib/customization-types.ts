// Types shared across the per-page customization system.

export type WallpaperFilters = {
  blur?: number;        // 0–20 px
  brightness?: number;  // 0–2
  contrast?: number;    // 0–2
  saturate?: number;    // 0–2
  opacity?: number;     // 0–1
  preset?: string;      // 'none' | 'mono' | 'sepia' | 'noir' | 'soft' | 'vivid'
};

export type CustomWidget = {
  id: string;
  type: "text" | "heading" | "image" | "divider" | "spacer" | "embed";
  content?: string;       // text/heading content, image URL, embed URL
  level?: 1 | 2 | 3 | 4;  // heading level
  height?: number;        // spacer height in px
  align?: "left" | "center" | "right";
  color?: string;         // hsl override for the widget text/icon
  bg?: string;            // hsl background color
  width?: string;         // CSS width e.g. "100%", "320px"
  sort_order: number;
};

export type ScopeType = "global" | "page" | "element";

export type Customization = {
  scope_type: ScopeType;
  scope_key: string;            // e.g. "global", "page:/", "element:home.banner.bg"
  color?: string | null;        // hsl(...) for element scopes
  wallpaper_path?: string | null;
  wallpaper_filters: WallpaperFilters;
  widgets: CustomWidget[];      // page-scope only
  hidden_sections: string[];    // page-scope only — list of section keys
};

export const FILTER_PRESETS: Record<string, WallpaperFilters> = {
  none:  { blur: 0,  brightness: 1,    contrast: 1,    saturate: 1,    opacity: 1 },
  soft:  { blur: 8,  brightness: 1.05, contrast: 0.95, saturate: 0.9,  opacity: 0.85 },
  mono:  { blur: 0,  brightness: 1,    contrast: 1.05, saturate: 0,    opacity: 0.9 },
  sepia: { blur: 0,  brightness: 1.05, contrast: 0.95, saturate: 0.4,  opacity: 0.9 },
  noir:  { blur: 0,  brightness: 0.7,  contrast: 1.3,  saturate: 0,    opacity: 1 },
  vivid: { blur: 0,  brightness: 1.05, contrast: 1.15, saturate: 1.5,  opacity: 1 },
  dream: { blur: 14, brightness: 1.1,  contrast: 0.9,  saturate: 1.2,  opacity: 0.7 },
};
