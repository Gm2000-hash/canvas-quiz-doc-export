import { useState } from "react";
import { AppNavSheet } from "@/components/AppNavSheet";
import { PageBanner } from "@/components/PageBanner";
import { HomeBookShelf } from "@/components/HomeBookShelf";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Sparkles } from "lucide-react";
import GenerateContentDialog from "@/components/GenerateContentDialog";

export default function ReadingLibrary() {
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpenCheck className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold text-foreground">Reading Library</span>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setGenerateOpen(true)} className="gap-2 rounded-xl" size="sm">
            <Sparkles className="h-4 w-4" />
            AI Generate
          </Button>
        </div>
      </header>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8">
        <PageBanner
          greeting="Reading Library"
          subtitle="Shared curriculum readings and PDF resources"
          compact
        />
        <HomeBookShelf />
      </main>

      <GenerateContentDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onComplete={() => window.location.reload()}
        defaultContentType="reading"
      />
    </div>
  );
}
