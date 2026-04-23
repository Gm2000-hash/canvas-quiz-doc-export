import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function CustomizeButton() {
  const { setPanelOpen, editMode, hasDraft } = useTheme();
  return (
    <Button
      onClick={() => setPanelOpen(true)}
      className="fixed bottom-5 right-5 z-[100] rounded-full shadow-lg h-12 w-12 p-0"
      variant={editMode ? "default" : "secondary"}
      title="Customize page"
      data-customize-ui
    >
      <Palette className="h-5 w-5" />
      {hasDraft && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-2 border-background" />
      )}
    </Button>
  );
}
