import { SettingsForm } from '@/components/SettingsForm';
import { QuizBrowser } from '@/components/QuizBrowser';
import { useCanvasConfig } from '@/hooks/useCanvasConfig';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Menu, FileText, BookOpen, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { config, setConfig, isConfigured } = useCanvasConfig();
  const { signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-16 border-b bg-primary text-primary-foreground flex items-center px-4 gap-4 shadow-md">
        {isConfigured && (
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-6 pb-2">
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <SettingsForm config={config} onSave={(c) => { setConfig(c); setSettingsOpen(false); }} onDisconnect={() => { setConfig(null); setSettingsOpen(false); }} />
              </div>
            </SheetContent>
          </Sheet>
        )}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Canvas Quiz Exporter</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10 gap-2"
            onClick={() => navigate('/question-bank')}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Question Bank</span>
          </Button>
          {isConfigured && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {!isConfigured ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="max-w-md w-full mx-auto px-4 space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Welcome</h2>
                <p className="text-muted-foreground">Connect your Canvas LMS to start exporting quizzes as Word documents.</p>
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
