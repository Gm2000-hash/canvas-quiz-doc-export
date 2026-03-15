import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppNavSheet } from "@/components/AppNavSheet";
import { PageBanner } from "@/components/PageBanner";
import { ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { ALL_IDAHO_STANDARDS, ALL_IDAHO_STANDARDS_FLAT, IDAHO_CATEGORY_LABELS } from "@/lib/idaho-standards-data";
import { Search, ArrowLeft, BookOpen, FlaskConical, Calculator, Landmark, Filter } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  essential: "bg-primary/10 text-primary border-primary/20",
  supporting: "bg-accent/10 text-accent border-accent/20",
  additional: "bg-muted text-muted-foreground border-border",
  teacher_guidance: "bg-warning/10 text-warning border-warning/20",
  big_idea: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const SUBJECT_ICONS: Record<string, React.ElementType> = {
  "ELA": BookOpen,
  "Math": Calculator,
  "Social Studies": Landmark,
  "Science": FlaskConical,
};

export default function StandardsBrowser() {
  const navigate = useNavigate();
  const [framework, setFramework] = useState<"idaho" | "ngss">("idaho");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // NGSS flat list
  const ngssFlat = useMemo(() =>
    Object.entries(ALL_SUBSTANDARDS).flatMap(([group, standards]) =>
      standards.map(s => ({ ...s, group }))
    ), []
  );

  // Get the unique NGSS groups
  const ngssGroups = Object.keys(ALL_SUBSTANDARDS);

  const filteredIdaho = useMemo(() => {
    let standards = ALL_IDAHO_STANDARDS_FLAT;
    if (gradeFilter !== "all") {
      const [subject, grade] = gradeFilter.split("|");
      standards = standards.filter(s => s.subject === subject && s.grade === grade);
    }
    if (categoryFilter !== "all") {
      standards = standards.filter(s => s.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      standards = standards.filter(s =>
        s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
    }
    return standards;
  }, [gradeFilter, categoryFilter, search]);

  const filteredNgss = useMemo(() => {
    let standards = ngssFlat;
    if (gradeFilter !== "all") {
      standards = standards.filter(s => s.group === gradeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      standards = standards.filter(s =>
        s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
    }
    return standards;
  }, [ngssFlat, gradeFilter, search]);

  // Count stats for Idaho
  const idahoStats = useMemo(() => {
    const filtered = gradeFilter !== "all"
      ? ALL_IDAHO_STANDARDS_FLAT.filter(s => {
          const [subject, grade] = gradeFilter.split("|");
          return s.subject === subject && s.grade === grade;
        })
      : ALL_IDAHO_STANDARDS_FLAT;
    return {
      total: filtered.length,
      essential: filtered.filter(s => s.category === "essential").length,
      supporting: filtered.filter(s => s.category === "supporting").length,
      additional: filtered.filter(s => s.category === "additional").length,
    };
  }, [gradeFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <AppNavSheet />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Standards Browser</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <PageBanner
          compact
          greeting="Standards Browser"
          subtitle="Browse Idaho and NGSS standards organized by subject, grade, and category"
        />
        {/* Framework toggle */}
        <Tabs value={framework} onValueChange={v => { setFramework(v as any); setGradeFilter("all"); setCategoryFilter("all"); setSearch(""); }}>
          <TabsList className="w-full max-w-sm">
            <TabsTrigger value="idaho" className="flex-1 gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Idaho Standards
            </TabsTrigger>
            <TabsTrigger value="ngss" className="flex-1 gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> NGSS (Science)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search standards..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {framework === "idaho" ? (
            <>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects & Grades</SelectItem>
                  {ALL_IDAHO_STANDARDS.map(gs => (
                    <SelectItem key={`${gs.subject}|${gs.grade}`} value={`${gs.subject}|${gs.grade}`}>
                      {gs.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(IDAHO_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {ngssGroups.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stats bar for Idaho */}
        {framework === "idaho" && (
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold">{idahoStats.total}</span>
              <span className="text-muted-foreground">total</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="font-medium">{idahoStats.essential}</span>
              <span className="text-muted-foreground">essential</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="font-medium">{idahoStats.supporting}</span>
              <span className="text-muted-foreground">supporting</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
              <span className="font-medium">{idahoStats.additional}</span>
              <span className="text-muted-foreground">additional</span>
            </div>
          </div>
        )}

        {/* Standards list */}
        {framework === "idaho" ? (
          <div className="space-y-2">
            {filteredIdaho.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No standards match your search or filters.
                </CardContent>
              </Card>
            ) : (
              filteredIdaho.map((s, idx) => {
                const Icon = SUBJECT_ICONS[s.subject] || BookOpen;
                return (
                  <Card key={`${s.code}-${idx}`} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono font-semibold text-sm">{s.code}</span>
                            <Badge className={`text-[10px] px-1.5 py-0 border ${CATEGORY_COLORS[s.category] || ""}`}>
                              {IDAHO_CATEGORY_LABELS[s.category]}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {s.subject} {s.grade}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNgss.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No standards match your search or filters.
                </CardContent>
              </Card>
            ) : (
              filteredNgss.map((s, idx) => (
                <Card key={`${s.code}-${idx}`} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono font-semibold text-sm">{s.code}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.group}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pb-6">
          {framework === "idaho"
            ? `Showing ${filteredIdaho.length} of ${ALL_IDAHO_STANDARDS_FLAT.length} Idaho standards`
            : `Showing ${filteredNgss.length} of ${ngssFlat.length} NGSS standards`}
        </div>
      </main>
    </div>
  );
}
