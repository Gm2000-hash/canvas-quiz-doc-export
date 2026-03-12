// Deterministic color palette for units — returns HSL-based tailwind-compatible styles
const UNIT_COLORS = [
  { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/30", dot: "bg-blue-500" },
  { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/30", dot: "bg-amber-500" },
  { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/30", dot: "bg-purple-500" },
  { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/30", dot: "bg-rose-500" },
  { bg: "bg-cyan-500/15", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  { bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/30", dot: "bg-orange-500" },
  { bg: "bg-indigo-500/15", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/30", dot: "bg-indigo-500" },
  { bg: "bg-pink-500/15", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/30", dot: "bg-pink-500" },
  { bg: "bg-teal-500/15", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/30", dot: "bg-teal-500" },
];

const STANDALONE_COLOR = { bg: "bg-muted/60", text: "text-muted-foreground", border: "border-border/60", dot: "bg-muted-foreground" };

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getUnitColor(unitId: string | null) {
  if (!unitId) return STANDALONE_COLOR;
  return UNIT_COLORS[hashString(unitId) % UNIT_COLORS.length];
}

export { UNIT_COLORS };
