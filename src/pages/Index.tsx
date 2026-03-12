import { SettingsForm } from "@/components/SettingsForm";
import { QuizBrowser } from "@/components/QuizBrowser";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Menu, FileText, BookOpen, LogOut, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { config, setConfig, isConfigured } = useCanvasConfig();
  const { signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        {isConfigured && (
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent rounded-xl h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-6 pb-2">
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <SettingsForm
                  config={config}
                  onSave={(c) => {
                    setConfig(c);
                    setSettingsOpen(false);
                  }}
                  onDisconnect={() => {
                    setConfig(null);
                    setSettingsOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold text-foreground">Canvas Quiz Exporter</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-accent rounded-xl gap-2 font-medium"
            onClick={() => navigate("/lesson-planner")}
          >
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Lesson Planner</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-accent rounded-xl gap-2 font-medium"
            onClick={() => navigate("/question-bank")}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Question Bank</span>
          </Button>
          {isConfigured && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-accent rounded-xl h-9 w-9"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4.5 w-4.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-accent rounded-xl h-9 w-9"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </Button>
        </div>
      </header>

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

export default Index;
