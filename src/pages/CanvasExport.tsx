import { SettingsForm } from "@/components/SettingsForm";
import { QuizBrowser } from "@/components/QuizBrowser";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { FileText } from "lucide-react";
import { useEffect } from "react";

interface CanvasExportProps {
  /** Rendered inside the unified Canvas hub (no page chrome of its own). */
  embedded?: boolean;
  onOpenSettings?: () => void;
}

const CanvasExport = ({ embedded = false }: CanvasExportProps = {}) => {
  const { config, setConfig, isConfigured } = useCanvasConfig();

  // When the inline refresh dialog persists a new token to localStorage,
  // sync it back into React state so downstream components see the update.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'canvas_config' && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch { /* ignore */ }
      }
    };
    const onLocalUpdate = () => {
      try {
        const raw = localStorage.getItem('canvas_config');
        if (raw) setConfig(JSON.parse(raw));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('canvas-config-updated', onLocalUpdate);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('canvas-config-updated', onLocalUpdate);
    };
  }, [setConfig]);

  if (!isConfigured) {
    return (
      <div className={embedded ? "py-6" : "flex items-center justify-center min-h-[60vh]"}>
        <div className="max-w-sm w-full mx-auto px-4 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Welcome</h2>
            <p className="text-sm text-muted-foreground">
              Connect your Canvas LMS to start exporting quizzes as Word documents.
            </p>
          </div>
          <SettingsForm config={config} onSave={setConfig} onDisconnect={() => setConfig(null)} />
        </div>
      </div>
    );
  }

  return <QuizBrowser config={config!} />;
};

export default CanvasExport;
