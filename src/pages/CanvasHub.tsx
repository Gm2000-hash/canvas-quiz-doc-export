import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BentoHero } from "@/components/BentoHero";
import { SettingsForm } from "@/components/SettingsForm";
import { CanvasTokenRefreshDialog } from "@/components/CanvasTokenRefreshDialog";
import { useCanvasConfig } from "@/hooks/useCanvasConfig";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Download, Users, BarChart3, Settings } from "lucide-react";
import CanvasExport from "./CanvasExport";
import CanvasResults from "./CanvasResults";
import QuizAnalytics from "./QuizAnalytics";

type TabKey = "export" | "results" | "analytics";

const VALID: TabKey[] = ["export", "results", "analytics"];

export default function CanvasHub() {
  usePageTitle("Canvas Workspace");
  const { config, setConfig, isConfigured } = useCanvasConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const paramTab = searchParams.get("tab") as TabKey | null;
  const tab: TabKey = paramTab && VALID.includes(paramTab) ? paramTab : "export";

  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CanvasTokenRefreshDialog />

      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 backdrop-blur-sm flex items-center px-4 gap-4">
        <AppNavSheet showSettings={isConfigured} onOpenSettings={() => setSettingsOpen(true)} />
        <Breadcrumbs items={[{ label: "Canvas Workspace" }]} />
      </header>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Canvas settings</SheetTitle>
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

      <main className="flex-1">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <BentoHero
            eyebrow="Canvas LMS"
            title={<>Export, pull results, and <em className="italic font-light">analyze</em> — in one place.</>}
            subtitle="Browse courses and export quizzes to Word, pull student submissions and map them to standards, then review performance analytics across ISAT, Canvas, and embedded activities."
            primaryAction={{ label: "Canvas settings", onClick: () => setSettingsOpen(true), icon: Settings }}
            sideTiles={[
              {
                variant: "coral",
                eyebrow: "Quick export",
                title: "One-click .docx",
                body: "Pick a quiz tile in the Export tab to download instantly.",
              },
              {
                variant: "sky",
                eyebrow: "Now unified",
                title: "Results + analytics",
                body: "Switch tabs without losing your Canvas connection.",
              },
            ]}
          />

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="export" className="gap-1.5">
                <Download className="h-4 w-4" /> Export
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-1.5">
                <Users className="h-4 w-4" /> Results
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="mt-6">
              <CanvasExport embedded />
            </TabsContent>
            <TabsContent value="results" className="mt-6">
              <CanvasResults embedded />
            </TabsContent>
            <TabsContent value="analytics" className="mt-6">
              <QuizAnalytics embedded />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
