import { ReactNode } from "react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

/**
 * Wrap any built-in page section with this to make it user-hideable.
 * In edit mode, a small toolbar appears to toggle visibility.
 */
export function HideableSection({
  sectionKey,
  label,
  children,
  className = "",
}: {
  sectionKey: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const { editMode, isSectionHidden, toggleSection } = useTheme();
  const hidden = isSectionHidden(sectionKey);

  return (
    <div data-section={sectionKey} data-section-label={label} className={`relative ${className} ${hidden && editMode ? "tk-hidden-section" : ""}`}>
      {editMode && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-1 bg-popover border border-border rounded-full px-2 py-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => { e.stopPropagation(); toggleSection(sectionKey); }}
            title={hidden ? "Show section" : "Hide section"}
          >
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}
