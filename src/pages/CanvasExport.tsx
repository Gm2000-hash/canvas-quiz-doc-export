import { SettingsForm } from "@/components/SettingsForm";
import { QuizBrowser } from "@/components/QuizBrowser";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { ArrowLeft, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Button } from "@/components/ui/button";

const CanvasExport = () => {
  const { config, setConfig, isConfigured } = useCanvasConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet showSettings={isConfigured} onOpenSettings={() => setSettingsOpen(true)} />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold text-foreground">Canvas Quiz Exporter</span>
        </div>
      </header>

      {isConfigured && (
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-6 pb-2">
              <SheetTitle>Settings</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <SettingsForm
                config={config}
                onSave={(c) => { setConfig(c); setSettingsOpen(false); }}
                onDisconnect={() => { setConfig(null); setSettingsOpen(false); }}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <main className="flex-1">
        {!isConfigured ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
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
        ) : (
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <QuizBrowser config={config!} />
          </div>
        )}
      </main>
    </div>
  );
};

export default CanvasExport;
