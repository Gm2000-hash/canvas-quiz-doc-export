import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StandardsCoverageGridProps {
  questions: { id: string; standards: { ngss_code: string }[] }[];
  onGapClick?: (standardCode: string, standardDescription: string) => void;
}

const DISCIPLINES: { key: string; label: string; coreIdeas: string[] }[] = [
  { key: "LS", label: "Life Science", coreIdeas: ["MS-LS1", "MS-LS2", "MS-LS3", "MS-LS4"] },
  { key: "ESS", label: "Earth & Space Science", coreIdeas: ["MS-ESS1", "MS-ESS2", "MS-ESS3"] },
  { key: "PS", label: "Physical Science", coreIdeas: ["MS-PS1", "MS-PS2", "MS-PS3", "MS-PS4"] },
];

export function StandardsCoverageGrid({ questions, onGapClick }: StandardsCoverageGridProps) {
  const countMap = new Map<string, number>();
  for (const q of questions) {
    for (const s of q.standards) {
      countMap.set(s.ngss_code, (countMap.get(s.ngss_code) || 0) + 1);
    }
  }

  const allStandards = Object.values(ALL_SUBSTANDARDS).flat();
  const totalStandards = allStandards.length;
  const coveredCount = allStandards.filter(s => (countMap.get(s.code) || 0) > 0).length;
  const gapCount = totalStandards - coveredCount;
  const coveragePct = totalStandards > 0 ? Math.round((coveredCount / totalStandards) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Standards Coverage</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {coveredCount}/{totalStandards} standards assessed ({coveragePct}%)
              {gapCount > 0 && (
                <span className="text-destructive font-medium"> · {gapCount} gap{gapCount !== 1 ? "s" : ""}</span>
              )}
            </p>
          </div>
          {gapCount === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Full Coverage
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" /> Gaps Found
            </div>
          )}
        </div>

        <Progress value={coveragePct} className="h-2" />

        <TooltipProvider delayDuration={200}>
          <div className="space-y-3">
            {DISCIPLINES.map(disc => {
              const discStandards = disc.coreIdeas.flatMap(ci => ALL_SUBSTANDARDS[ci] || []);
              const discCovered = discStandards.filter(s => (countMap.get(s.code) || 0) > 0).length;
              const discTotal = discStandards.length;

              return (
                <div key={disc.key}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {disc.label}
                    <span className="ml-1.5 text-[10px] font-normal">
                      ({discCovered}/{discTotal})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {disc.coreIdeas.flatMap(ci =>
                      (ALL_SUBSTANDARDS[ci] || []).map(sub => {
                        const count = countMap.get(sub.code) || 0;
                        const isGap = count === 0;

                        return (
                          <Tooltip key={sub.code}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={isGap && onGapClick ? () => onGapClick(sub.code, sub.description) : undefined}
                                className={`
                                  px-1.5 py-0.5 rounded text-[10px] font-mono leading-tight transition-colors
                                  ${isGap
                                    ? "bg-destructive/10 text-destructive border border-destructive/30 ring-1 ring-destructive/20 cursor-pointer hover:bg-destructive/20 hover:ring-destructive/40"
                                    : count <= 2
                                      ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 cursor-default"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 cursor-default"
                                  }
                                `}
                              >
                                {sub.code.replace("MS-", "")}
                                {!isGap && <span className="ml-0.5 font-semibold">({count})</span>}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-semibold text-xs">{sub.code}</p>
                              <p className="text-xs text-muted-foreground">{sub.description}</p>
                              {isGap ? (
                                <p className="text-xs font-medium mt-1 text-destructive flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> Click to generate questions
                                </p>
                              ) : (
                                <p className="text-xs font-medium mt-1 text-foreground">
                                  {count} question{count !== 1 ? "s" : ""}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
