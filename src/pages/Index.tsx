import { SettingsForm } from '@/components/SettingsForm';
import { QuizBrowser } from '@/components/QuizBrowser';
import { useCanvasConfig } from '@/hooks/useCanvasConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Settings } from 'lucide-react';

const Index = () => {
  const { config, setConfig, isConfigured } = useCanvasConfig();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-card-foreground">Canvas Quiz Exporter</h1>
              <p className="text-sm text-muted-foreground">Export any Canvas quiz as a printable Word document</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container py-8">
        {!isConfigured ? (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Get Started</h2>
              <p className="text-muted-foreground">Connect your Canvas LMS to start exporting quizzes.</p>
            </div>
            <SettingsForm config={config} onSave={setConfig} onDisconnect={() => setConfig(null)} />
          </div>
        ) : (
          <Tabs defaultValue="export">
            <TabsList className="mb-6">
              <TabsTrigger value="export" className="gap-2">
                <FileText className="h-4 w-4" />
                Export Quizzes
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="export">
              <QuizBrowser config={config!} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsForm config={config} onSave={setConfig} onDisconnect={() => setConfig(null)} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;
