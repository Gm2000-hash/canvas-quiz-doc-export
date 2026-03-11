import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getQuestionBank, deleteFromBank, updateQuestion, backfillDokAndBlooms, type QuestionBankItem } from "@/lib/question-bank";
import { DOK_LEVELS, BLOOMS_LEVELS, ALL_SUBSTANDARDS } from "@/lib/ngss-data";
import { exportBankQuizToDocx } from "@/lib/export-bank-quiz";
import { toast } from "sonner";
import { Loader2, Search, Trash2, FlaskConical, BookOpen, ArrowLeft, FileText, Pencil, X, List, LayoutGrid, Leaf, Globe, Atom, ChevronRight, ChevronDown, Wand2, BarChart3, PieChart as PieChartIcon, Plus } from "lucide-react";
import CreateQuestionDialog from "@/components/CreateQuestionDialog";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// NGSS discipline categories
interface DisciplineConfig {
  key: string;
  label: string;
  icon: typeof Leaf;
  coreIdeas: string[]; // All MS core idea codes for this discipline
}

const DISCIPLINES: DisciplineConfig[] = [
  { key: "LS", label: "Life Science", icon: Leaf, coreIdeas: ["MS-LS1", "MS-LS2", "MS-LS3", "MS-LS4"] },
  { key: "ESS", label: "Earth & Space Science", icon: Globe, coreIdeas: ["MS-ESS1", "MS-ESS2", "MS-ESS3"] },
  { key: "PS", label: "Physical Science", icon: Atom, coreIdeas: ["MS-PS1", "MS-PS2", "MS-PS3", "MS-PS4"] },
];

// Complete list of all MS NGSS performance expectations
const ALL_SUBSTANDARDS: Record<string, { code: string; description: string }[]> = {
  "MS-LS1": [
    { code: "MS-LS1-1", description: "Conduct an investigation to provide evidence that living things are made of cells" },
    { code: "MS-LS1-2", description: "Develop and use a model to describe the function of a cell as a whole and ways the parts of cells contribute to the function" },
    { code: "MS-LS1-3", description: "Use argument supported by evidence for how the body is a system of interacting subsystems" },
    { code: "MS-LS1-4", description: "Use argument based on empirical evidence and scientific reasoning to support an explanation for how characteristic animal behaviors and specialized plant structures affect the probability of successful reproduction" },
    { code: "MS-LS1-5", description: "Construct a scientific explanation based on evidence for how environmental and genetic factors influence the growth of organisms" },
    { code: "MS-LS1-6", description: "Construct a scientific explanation based on evidence for the role of photosynthesis in the cycling of matter and flow of energy into and out of organisms" },
    { code: "MS-LS1-7", description: "Develop a model to describe how food is rearranged through chemical reactions forming new molecules that support growth and/or release energy" },
    { code: "MS-LS1-8", description: "Gather and synthesize information that sensory receptors respond to stimuli by sending messages to the brain for immediate behavior or storage as memories" },
  ],
  "MS-LS2": [
    { code: "MS-LS2-1", description: "Analyze and interpret data to provide evidence for the effects of resource availability on organisms and populations" },
    { code: "MS-LS2-2", description: "Construct an explanation that predicts patterns of interactions among organisms across multiple ecosystems" },
    { code: "MS-LS2-3", description: "Develop a model to describe the cycling of matter and flow of energy among living and nonliving parts of an ecosystem" },
    { code: "MS-LS2-4", description: "Construct an argument supported by empirical evidence that changes to physical or biological components of an ecosystem affect populations" },
    { code: "MS-LS2-5", description: "Evaluate competing design solutions for maintaining biodiversity and ecosystem services" },
  ],
  "MS-LS3": [
    { code: "MS-LS3-1", description: "Develop and use a model to describe why structural changes to genes (mutations) located on chromosomes may affect proteins and may result in harmful, beneficial, or neutral effects" },
    { code: "MS-LS3-2", description: "Develop and use a model to describe why asexual reproduction results in offspring with identical genetic information and sexual reproduction results in offspring with genetic variation" },
  ],
  "MS-LS4": [
    { code: "MS-LS4-1", description: "Analyze and interpret data for patterns in the fossil record that document the existence, diversity, extinction, and change of life forms" },
    { code: "MS-LS4-2", description: "Apply scientific ideas to construct an explanation for the anatomical similarities and differences among modern organisms and between modern and fossil organisms" },
    { code: "MS-LS4-3", description: "Analyze displays of pictorial data to compare patterns of similarities in the embryological development across multiple species" },
    { code: "MS-LS4-4", description: "Construct an explanation based on evidence that describes how genetic variations of traits in a population increase some individuals' probability of surviving and reproducing" },
    { code: "MS-LS4-5", description: "Gather and synthesize information about technologies that have changed the way humans influence the inheritance of desired traits in organisms" },
    { code: "MS-LS4-6", description: "Use mathematical representations to support explanations of how natural selection may lead to increases and decreases of specific traits in populations over time" },
  ],
  "MS-ESS1": [
    { code: "MS-ESS1-1", description: "Develop and use a model of the Earth-sun-moon system to describe the cyclic patterns of lunar phases, eclipses of the sun and moon, and seasons" },
    { code: "MS-ESS1-2", description: "Develop and use a model to describe the role of gravity in the motions within galaxies and the solar system" },
    { code: "MS-ESS1-3", description: "Analyze and interpret data to determine scale properties of objects in the solar system" },
    { code: "MS-ESS1-4", description: "Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth's 4.6-billion-year-old history" },
  ],
  "MS-ESS2": [
    { code: "MS-ESS2-1", description: "Develop a model to describe the cycling of Earth's materials and the flow of energy that drives this process" },
    { code: "MS-ESS2-2", description: "Construct an explanation based on evidence for how geoscience processes have changed Earth's surface at varying time and spatial scales" },
    { code: "MS-ESS2-3", description: "Analyze and interpret data on the distribution of fossils and rocks, continental shapes, and seafloor structures to provide evidence of the past plate motions" },
    { code: "MS-ESS2-4", description: "Develop a model to describe the cycling of water through Earth's systems driven by energy from the sun and the force of gravity" },
    { code: "MS-ESS2-5", description: "Collect data to provide evidence for how the motions and complex interactions of air masses result in changes in weather conditions" },
    { code: "MS-ESS2-6", description: "Develop and use a model to describe how unequal heating and rotation of the Earth cause patterns of atmospheric and oceanic circulation" },
  ],
  "MS-ESS3": [
    { code: "MS-ESS3-1", description: "Construct a scientific explanation based on evidence for how the uneven distributions of Earth's mineral, energy, and groundwater resources are the result of past and current geoscience processes" },
    { code: "MS-ESS3-2", description: "Analyze and interpret data on natural hazards to forecast future catastrophic events and inform the development of technologies to mitigate their effects" },
    { code: "MS-ESS3-3", description: "Apply scientific principles to design a method for monitoring and minimizing a human impact on the environment" },
    { code: "MS-ESS3-4", description: "Construct an argument supported by evidence for how increases in human population and per-capita consumption of natural resources impact Earth's systems" },
    { code: "MS-ESS3-5", description: "Ask questions to clarify evidence of the factors that have caused the rise in global temperatures over the past century" },
  ],
  "MS-PS1": [
    { code: "MS-PS1-1", description: "Develop models to describe the atomic composition of simple molecules and extended structures" },
    { code: "MS-PS1-2", description: "Analyze and interpret data on the properties of substances before and after the substances interact to determine if a chemical reaction has occurred" },
    { code: "MS-PS1-3", description: "Gather and make sense of information to describe that synthetic materials come from natural resources and impact society" },
    { code: "MS-PS1-4", description: "Develop a model that predicts and describes changes in particle motion, temperature, and state of a pure substance when thermal energy is added or removed" },
    { code: "MS-PS1-5", description: "Develop and use a model to describe how the total number of atoms does not change in a chemical reaction and thus mass is conserved" },
    { code: "MS-PS1-6", description: "Undertake a design project to construct, test, and modify a device that either releases or absorbs thermal energy by chemical processes" },
  ],
  "MS-PS2": [
    { code: "MS-PS2-1", description: "Apply Newton's Third Law to design a solution to a problem involving the motion of two colliding objects" },
    { code: "MS-PS2-2", description: "Plan an investigation to provide evidence that the change in an object's motion depends on the sum of the forces acting on the object and the mass of the object" },
    { code: "MS-PS2-3", description: "Ask questions about data to determine the factors that affect the strength of electric and magnetic forces" },
    { code: "MS-PS2-4", description: "Construct and present arguments using evidence to support the claim that gravitational interactions are attractive and depend on the masses of interacting objects" },
    { code: "MS-PS2-5", description: "Conduct an investigation and evaluate the experimental design to provide evidence that fields exist between objects exerting forces on each other even though the objects are not in contact" },
  ],
  "MS-PS3": [
    { code: "MS-PS3-1", description: "Construct and interpret graphical displays of data to describe the relationships of kinetic energy to the mass of an object and to the speed of an object" },
    { code: "MS-PS3-2", description: "Develop a model to describe that when the arrangement of objects interacting at a distance changes, different amounts of potential energy are stored in the system" },
    { code: "MS-PS3-3", description: "Apply scientific principles to design, construct, and test a device that either minimizes or maximizes thermal energy transfer" },
    { code: "MS-PS3-4", description: "Plan an investigation to determine the relationships among the energy transferred, the type of matter, the mass, and the change in the average kinetic energy of the particles as measured by the temperature of the sample" },
    { code: "MS-PS3-5", description: "Construct, use, and present arguments to support the claim that when the kinetic energy of an object changes, energy is transferred to or from the object" },
  ],
  "MS-PS4": [
    { code: "MS-PS4-1", description: "Use mathematical representations to describe a simple model for waves that includes how the amplitude of a wave is related to the energy in a wave" },
    { code: "MS-PS4-2", description: "Develop and use a model to describe that waves are reflected, absorbed, or transmitted through various materials" },
    { code: "MS-PS4-3", description: "Integrate qualitative scientific and technical information to support the claim that digitized signals are a more reliable way to encode and transmit information than analog signals" },
  ],
};

// Parse a standard code like "MS-LS1-3" into { discipline: "LS", coreIdea: "MS-LS1", full: "MS-LS1-3" }
function parseStandardCode(code: string) {
  // Match patterns like MS-LS1-3, HS-PS2-1, MS-ESS1-4
  const match = code.match(/^(MS|HS)-(LS|ESS|PS)(\d+)(-\d+)?$/i);
  if (!match) return null;
  const level = match[1].toUpperCase(); // MS or HS
  const discipline = match[2].toUpperCase(); // LS, ESS, PS
  const coreNum = match[3]; // 1, 2, 3, etc.
  return {
    level,
    discipline,
    coreNum,
    // The "core idea" grouping key — always use MS prefix for grouping
    coreIdea: `MS-${discipline}${coreNum}`,
    full: code,
  };
}

// Get the core idea label (e.g., "MS-LS1" from "MS-LS1" or "HS-LS1")
function getCoreIdeaFromCode(code: string): string | null {
  const parsed = parseStandardCode(code);
  return parsed ? parsed.coreIdea : null;
}

function getDisciplineForCode(code: string): string | null {
  const parsed = parseStandardCode(code);
  return parsed ? parsed.discipline : null;
}

const QuestionBank = () => {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDok, setFilterDok] = useState<string>("all");
  const [filterBlooms, setFilterBlooms] = useState<string>("all");
  const [filterStandard, setFilterStandard] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [chartMode, setChartMode] = useState<"bar" | "donut">("bar");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [quizTitle, setQuizTitle] = useState("Custom Quiz");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  // Drill-down state for grouped view
  const [expandedDiscipline, setExpandedDiscipline] = useState<string | null>(null);
  const [expandedCoreIdea, setExpandedCoreIdea] = useState<string | null>(null);

  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [editText, setEditText] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editType, setEditType] = useState("multiple_choice_question");
  const [editAnswers, setEditAnswers] = useState<{ id: number; text: string; weight: number; left?: string; right?: string }[]>([]);
  const [editStandards, setEditStandards] = useState<{ ngss_code: string; ngss_description: string }[]>([]);
  const [editDok, setEditDok] = useState<number | null>(null);
  const [editBlooms, setEditBlooms] = useState<string | null>(null);
  const [standardSearch, setStandardSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // DOK and Bloom's levels imported from shared data

  const QUESTION_TYPES = [
    { value: "multiple_choice_question", label: "Multiple Choice" },
    { value: "multiple_answers_question", label: "Multiple Correct Answers" },
    { value: "matching_question", label: "Matching" },
    { value: "fill_in_multiple_blanks_question", label: "Fill in the Blank" },
    { value: "short_answer_question", label: "Short Answer" },
    { value: "essay_question", label: "Essay" },
    { value: "true_false_question", label: "True/False" },
  ];

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await getQuestionBank();
      setQuestions(data);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuestions(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteFromBank(id);
      setQuestions(q => q.filter(item => item.id !== id));
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast.success("Question removed");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const openEdit = (q: QuestionBankItem) => {
    setEditingQuestion(q);
    setEditText(stripHtml(q.question_text));
    setEditPoints(q.points_possible);
    setEditType(q.question_type);
    setEditAnswers((q.answers || []).map((a: any, i: number) => ({
      id: a.id || i,
      text: stripHtml(a.text || a.html || ""),
      weight: a.weight ?? 0,
      left: a.left || "",
      right: a.right || "",
    })));
    setEditStandards([...q.standards]);
    setEditDok(q.dok_level);
    setEditBlooms(q.blooms_level);
    setStandardSearch("");
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    setSaving(true);
    try {
      const savedAnswers = editAnswers.map(a => ({
        id: a.id,
        text: a.text,
        html: a.text,
        weight: a.weight,
        ...(editType === "matching_question" ? { left: a.left, right: a.right } : {}),
      }));
      await updateQuestion(
        editingQuestion.id,
        { question_text: editText, points_possible: editPoints, question_type: editType, answers: savedAnswers, dok_level: editDok, blooms_level: editBlooms },
        editStandards
      );
      setQuestions(prev => prev.map(q =>
        q.id === editingQuestion.id
          ? { ...q, question_text: editText, points_possible: editPoints, question_type: editType, answers: savedAnswers, dok_level: editDok, blooms_level: editBlooms, standards: editStandards }
          : q
      ));
      setEditingQuestion(null);
      toast.success("Question updated");
    } catch {
      toast.error("Failed to update question");
    } finally {
      setSaving(false);
    }
  };

  const removeStandard = (idx: number) => {
    setEditStandards(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = questions.filter(q => {
    if (search && !stripHtml(q.question_text).toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDok !== "all" && String(q.dok_level) !== filterDok) return false;
    if (filterBlooms !== "all" && (q.blooms_level || "").toLowerCase() !== filterBlooms.toLowerCase()) return false;
    if (filterStandard !== "all") {
      if (filterStandard === "untagged") {
        if (q.standards.length > 0) return false;
      } else if (filterStandard.startsWith("disc:")) {
        // Filter by discipline (e.g., "disc:LS")
        const discKey = filterStandard.replace("disc:", "");
        if (!q.standards.some(s => getDisciplineForCode(s.ngss_code) === discKey)) return false;
      } else {
        // Filter by specific core idea (e.g., "MS-LS1")
        if (!q.standards.some(s => getCoreIdeaFromCode(s.ngss_code) === filterStandard)) return false;
      }
    }
    return true;
  });

  const selectAllFiltered = () => {
    if (filtered.every(q => selected.has(q.id))) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(q => next.delete(q.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(q => next.add(q.id));
        return next;
      });
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const count = await backfillDokAndBlooms();
      if (count > 0) {
        toast.success(`Auto-tagged ${count} question${count !== 1 ? "s" : ""} with DOK & Bloom's levels`);
        await loadQuestions();
      } else {
        toast.info("All questions already have DOK & Bloom's levels set");
      }
    } catch {
      toast.error("Failed to backfill levels");
    } finally {
      setBackfilling(false);
    }
  };

  const handleExport = async () => {
    const selectedQuestions = questions.filter(q => selected.has(q.id));
    if (selectedQuestions.length === 0) return;
    setExporting(true);
    try {
      await exportBankQuizToDocx(quizTitle, selectedQuestions, includeAnswerKey);
      toast.success("Quiz exported!");
      setShowExportDialog(false);
    } catch {
      toast.error("Failed to export quiz");
    } finally {
      setExporting(false);
    }
  };

  // Build discipline → coreIdea → questions hierarchy
  // HS standards are grouped under their MS counterpart core idea
  const buildHierarchy = () => {
    // Map: discipline key → { coreIdea → { questions: Set<id>, descriptions: Set<string> } }
    const hierarchy: Map<string, Map<string, { questionIds: Set<string>; descriptions: Set<string> }>> = new Map();
    const untagged: QuestionBankItem[] = [];

    for (const disc of DISCIPLINES) {
      const discMap = new Map<string, { questionIds: Set<string>; descriptions: Set<string> }>();
      // Pre-populate all core ideas so they always appear
      for (const ci of disc.coreIdeas) {
        discMap.set(ci, { questionIds: new Set(), descriptions: new Set() });
      }
      hierarchy.set(disc.key, discMap);
    }

    for (const q of filtered) {
      if (q.standards.length === 0) {
        untagged.push(q);
        continue;
      }

      for (const s of q.standards) {
        const discipline = getDisciplineForCode(s.ngss_code);
        const coreIdea = getCoreIdeaFromCode(s.ngss_code);
        if (!discipline || !coreIdea) {
          // Non-standard code, treat as untagged if no other standards match
          continue;
        }

        const discMap = hierarchy.get(discipline);
        if (!discMap) continue;

        if (!discMap.has(coreIdea)) {
          discMap.set(coreIdea, { questionIds: new Set(), descriptions: new Set() });
        }
        const group = discMap.get(coreIdea)!;
        group.questionIds.add(q.id);
        if (s.ngss_description) group.descriptions.add(s.ngss_description);
      }
    }

    // Check if question has no recognized discipline tags → untagged
    for (const q of filtered) {
      if (q.standards.length > 0 && !q.standards.some(s => getDisciplineForCode(s.ngss_code))) {
        untagged.push(q);
      }
    }

    return { hierarchy, untagged };
  };

  const { hierarchy, untagged } = buildHierarchy();

  // Count questions per discipline
  const disciplineCounts = (discKey: string) => {
    const discMap = hierarchy.get(discKey);
    if (!discMap) return 0;
    const ids = new Set<string>();
    for (const group of discMap.values()) {
      group.questionIds.forEach(id => ids.add(id));
    }
    return ids.size;
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selected.has(q.id));

  const questionCard = (q: QuestionBankItem, keyPrefix: string) => (
    <Card key={`${keyPrefix}-${q.id}`} className={`group cursor-pointer transition-colors ${selected.has(q.id) ? "ring-2 ring-primary" : ""}`} onClick={() => toggleSelect(q.id)}>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} onClick={e => e.stopPropagation()} className="mt-0.5" />
          <p className="text-sm text-foreground flex-1">{stripHtml(q.question_text)}</p>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); openEdit(q); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(q.id); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-7">
          {q.standards.map(s => (
            <Badge key={s.ngss_code} variant="outline" className="text-xs">{s.ngss_code}</Badge>
          ))}
          {q.dok_level && (
            <Badge variant="secondary" className="text-xs">DOK {q.dok_level}</Badge>
          )}
          {q.blooms_level && (
            <Badge variant="secondary" className="text-xs capitalize">{q.blooms_level}</Badge>
          )}
          {q.source_course && (
            <span className="text-xs text-muted-foreground">
              {q.source_course}{q.source_quiz ? ` · ${q.source_quiz}` : ""}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{q.points_possible} pts</span>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 h-16 border-b bg-primary text-primary-foreground flex items-center px-4 gap-4 shadow-md">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Question Bank</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create Question
            </Button>
            <Button variant={viewMode === "grouped" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grouped")} className="gap-1.5">
              <LayoutGrid className="h-4 w-4" /> By Standard
            </Button>
            <Button variant={viewMode === "flat" ? "default" : "outline"} size="sm" onClick={() => setViewMode("flat")} className="gap-1.5">
              <List className="h-4 w-4" /> Flat List
            </Button>
            {questions.some(q => q.dok_level == null || q.blooms_level == null) && (
              <Button variant="outline" size="sm" onClick={handleBackfill} disabled={backfilling} className="gap-1.5">
                {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Auto-tag Levels
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={filterDok} onValueChange={setFilterDok}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="DOK Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All DOK Levels</SelectItem>
              {DOK_LEVELS.map(d => (
                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBlooms} onValueChange={setFilterBlooms}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Bloom's Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bloom's Levels</SelectItem>
              {BLOOMS_LEVELS.map(b => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStandard} onValueChange={setFilterStandard}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="NGSS Standard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Standards</SelectItem>
              <SelectItem value="untagged">Untagged</SelectItem>
              {DISCIPLINES.map(disc => (
                <React.Fragment key={disc.key}>
                  <SelectItem value={`disc:${disc.key}`}>{disc.label}</SelectItem>
                  {disc.coreIdeas.map(ci => (
                    <SelectItem key={ci} value={ci} className="pl-8 text-muted-foreground">{ci}</SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
          {(filterDok !== "all" || filterBlooms !== "all" || filterStandard !== "all") && (
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { setFilterDok("all"); setFilterBlooms("all"); setFilterStandard("all"); }}>
              <X className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}
          {selected.size > 0 && (
            <Button onClick={() => setShowExportDialog(true)} className="gap-2">
              <FileText className="h-4 w-4" />
              Create Quiz ({selected.size})
            </Button>
          )}
        </div>

        {/* Distribution summary bar */}
        {questions.length > 0 && (() => {
          const dokHex = ["#34d399", "#38bdf8", "#fbbf24", "#fb7185"];
          const dokBg = ["bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-rose-400"];
          const dokData = [1, 2, 3, 4].map((level, i) => ({
            name: `DOK ${level}`, value: questions.filter(q => q.dok_level === level).length, fill: dokHex[i], bg: dokBg[i],
          })).filter(d => d.value > 0);
          const dokUnset = questions.filter(q => q.dok_level == null).length;
          if (dokUnset > 0) dokData.push({ name: "Unset", value: dokUnset, fill: "#94a3b8", bg: "bg-slate-400" });

          const bloomsLabels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
          const bloomsHex = ["#94a3b8", "#34d399", "#38bdf8", "#fbbf24", "#fb923c", "#fb7185"];
          const bloomsBg = ["bg-slate-400", "bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-orange-400", "bg-rose-400"];
          const bloomsData = bloomsLabels.map((level, i) => ({
            name: level, value: questions.filter(q => (q.blooms_level || "").toLowerCase() === level.toLowerCase()).length, fill: bloomsHex[i], bg: bloomsBg[i],
          })).filter(d => d.value > 0);
          const bloomsUnset = questions.filter(q => !q.blooms_level).length;
          if (bloomsUnset > 0) bloomsData.push({ name: "Unset", value: bloomsUnset, fill: "#94a3b8", bg: "bg-slate-400" });

          const Legend = ({ data }: { data: { name: string; value: number; bg: string }[] }) => (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {data.map(d => (
                <span key={d.name} className="flex items-center gap-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${d.bg}`} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          );

          const DonutChart = ({ data }: { data: { name: string; value: number; fill: string; bg: string }[] }) => (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} strokeWidth={0}>
                    {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} question${value !== 1 ? "s" : ""}`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <Legend data={data} />
            </div>
          );

          return (
            <div className="space-y-2">
              <div className="flex justify-end">
                <div className="flex border rounded-md overflow-hidden">
                  <button className={`px-2 py-1 text-xs flex items-center gap-1 transition-colors ${chartMode === "bar" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`} onClick={() => setChartMode("bar")}>
                    <BarChart3 className="h-3.5 w-3.5" /> Bar
                  </button>
                  <button className={`px-2 py-1 text-xs flex items-center gap-1 transition-colors ${chartMode === "donut" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`} onClick={() => setChartMode("donut")}>
                    <PieChartIcon className="h-3.5 w-3.5" /> Donut
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DOK Distribution</p>
                    {chartMode === "bar" ? (
                      <>
                        <div className="flex gap-0.5 h-5 rounded-full overflow-hidden bg-muted">
                          {dokData.map(d => (
                            <div key={d.name} style={{ width: `${(d.value / questions.length) * 100}%`, backgroundColor: d.fill }} className="transition-all" title={`${d.name}: ${d.value}`} />
                          ))}
                        </div>
                        <Legend data={dokData} />
                      </>
                    ) : (
                      <DonutChart data={dokData} />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bloom's Distribution</p>
                    {chartMode === "bar" ? (
                      <>
                        <div className="flex gap-0.5 h-5 rounded-full overflow-hidden bg-muted">
                          {bloomsData.map(d => (
                            <div key={d.name} style={{ width: `${(d.value / questions.length) * 100}%`, backgroundColor: d.fill }} className="transition-all" title={`${d.name}: ${d.value}`} />
                          ))}
                        </div>
                        <Legend data={bloomsData} />
                      </>
                    ) : (
                      <DonutChart data={bloomsData} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })()}

        {/* Breadcrumb trail for grouped view */}
        {viewMode === "grouped" && (expandedDiscipline || expandedCoreIdea) && (
          <nav className="flex items-center gap-1.5 text-sm">
            <button
              className="text-primary hover:underline font-medium"
              onClick={() => { setExpandedDiscipline(null); setExpandedCoreIdea(null); }}
            >
              All Standards
            </button>
            {expandedDiscipline && expandedDiscipline !== "untagged" && (() => {
              const disc = DISCIPLINES.find(d => d.key === expandedDiscipline);
              return disc ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <button
                    className={`font-medium ${expandedCoreIdea ? "text-primary hover:underline" : "text-foreground"}`}
                    onClick={() => setExpandedCoreIdea(null)}
                  >
                    {disc.label}
                  </button>
                </>
              ) : null;
            })()}
            {expandedDiscipline === "untagged" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">Untagged</span>
              </>
            )}
            {expandedCoreIdea && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{expandedCoreIdea}</span>
              </>
            )}
          </nav>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{questions.length === 0 ? "Your question bank is empty. Export a quiz to start building it!" : "No questions match your search."}</p>
            </CardContent>
          </Card>
        ) : viewMode === "grouped" ? (
          /* 3-tier grouped view: Discipline tiles → Core Ideas → Questions */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox checked={allFilteredSelected} onCheckedChange={selectAllFiltered} />
              <p className="text-sm text-muted-foreground">
                {allFilteredSelected ? "Deselect all" : "Select all"} · {filtered.length} unique question{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Discipline tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DISCIPLINES.map(disc => {
                const count = disciplineCounts(disc.key);
                const isExpanded = expandedDiscipline === disc.key;
                const Icon = disc.icon;

                // Collect all question IDs in this discipline
                const discQuestionIds: string[] = [];
                const discMap = hierarchy.get(disc.key);
                if (discMap) {
                  for (const group of discMap.values()) {
                    group.questionIds.forEach(id => discQuestionIds.push(id));
                  }
                }
                const uniqueDiscIds = [...new Set(discQuestionIds)];
                const allDiscSelected = uniqueDiscIds.length > 0 && uniqueDiscIds.every(id => selected.has(id));

                // Coverage: count substandards with at least one question
                let totalSubs = 0;
                let coveredSubs = 0;
                for (const ci of disc.coreIdeas) {
                  const subs = ALL_SUBSTANDARDS[ci] || [];
                  totalSubs += subs.length;
                  const group = discMap?.get(ci);
                  if (group) {
                    for (const sub of subs) {
                      const hasQ = filtered.some(q =>
                        group.questionIds.has(q.id) &&
                        q.standards.some(s => {
                          if (s.ngss_code === sub.code) return true;
                          const parsed = parseStandardCode(s.ngss_code);
                          if (!parsed || parsed.level !== "HS") return false;
                          return `MS-${parsed.discipline}${parsed.coreNum}-${s.ngss_code.match(/-(\d+)$/)?.[1]}` === sub.code;
                        })
                      );
                      if (hasQ) coveredSubs++;
                    }
                  }
                }
                const coveragePct = totalSubs > 0 ? Math.round((coveredSubs / totalSubs) * 100) : 0;

                return (
                  <Card
                    key={disc.key}
                    className={`cursor-pointer transition-all hover:shadow-md ${isExpanded ? "ring-2 ring-primary col-span-1 sm:col-span-3" : ""} ${count === 0 ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (count === 0) return;
                      setExpandedDiscipline(isExpanded ? null : disc.key);
                      setExpandedCoreIdea(null);
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        {count > 0 && (
                          <Checkbox
                            checked={allDiscSelected}
                            onCheckedChange={() => {
                              setSelected(prev => {
                                const next = new Set(prev);
                                uniqueDiscIds.forEach(id => allDiscSelected ? next.delete(id) : next.add(id));
                                return next;
                              });
                            }}
                            onClick={e => e.stopPropagation()}
                            className="shrink-0"
                          />
                        )}
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{disc.label}</h3>
                          <p className="text-sm text-muted-foreground">{count} question{count !== 1 ? "s" : ""} · {coveredSubs}/{totalSubs} standards covered ({coveragePct}%)</p>
                        </div>
                        {count > 0 && (
                          isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Expanded: show core ideas for this discipline */}
                      {isExpanded && (
                        <div className="mt-4 space-y-2 border-t border-border pt-4 overflow-x-hidden min-w-0" onClick={e => e.stopPropagation()}>
                          {Array.from(hierarchy.get(disc.key)?.entries() || [])
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([coreIdea, group]) => {
                              const isCoreExpanded = expandedCoreIdea === coreIdea;
                              const coreQuestions = filtered.filter(q => group.questionIds.has(q.id));
                              const firstDesc = Array.from(group.descriptions)[0] || "";

                              return (
                                <div key={coreIdea}>
                                  <div className="flex items-center gap-2">
                                    {coreQuestions.length > 0 && (
                                      <Checkbox
                                        checked={coreQuestions.length > 0 && coreQuestions.every(q => selected.has(q.id))}
                                        onCheckedChange={() => {
                                          const allSelected = coreQuestions.every(q => selected.has(q.id));
                                          setSelected(prev => {
                                            const next = new Set(prev);
                                            coreQuestions.forEach(q => allSelected ? next.delete(q.id) : next.add(q.id));
                                            return next;
                                          });
                                        }}
                                        className="shrink-0"
                                        onClick={e => e.stopPropagation()}
                                      />
                                    )}
                                    <button
                                      className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                                      onClick={() => setExpandedCoreIdea(isCoreExpanded ? null : coreIdea)}
                                    >
                                      {isCoreExpanded ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="default" className="text-xs shrink-0">{coreIdea}</Badge>
                                          <span className="text-sm text-muted-foreground">({coreQuestions.length} question{coreQuestions.length !== 1 ? "s" : ""})</span>
                                        </div>
                                        {firstDesc && <p className="text-xs text-muted-foreground mt-1 break-words">{firstDesc}</p>}
                                      </div>
                                    </button>
                                  </div>

                                  {/* Expanded: show substandards with questions */}
                                  {isCoreExpanded && (
                                    <div className="space-y-3 mt-2 ml-6 border-l-2 border-primary/20 pl-4 overflow-x-hidden min-w-0">
                                      {(ALL_SUBSTANDARDS[coreIdea] || []).map(sub => {
                                        const subQuestions = coreQuestions.filter(q =>
                                          q.standards.some(s => s.ngss_code === sub.code) ||
                                          q.standards.some(s => {
                                            // Also match HS equivalent (e.g., HS-LS1-1 for MS-LS1-1)
                                            const parsed = parseStandardCode(s.ngss_code);
                                            if (!parsed || parsed.level !== "HS") return false;
                                            return `MS-${parsed.discipline}${parsed.coreNum}-${s.ngss_code.match(/-(\d+)$/)?.[1]}` === sub.code;
                                          })
                                        );
                                        return (
                                          <div key={sub.code}>
                                            <div className="flex items-start gap-2 py-1.5">
                                              <Badge variant={subQuestions.length > 0 ? "secondary" : "outline"} className="text-xs shrink-0 mt-0.5">
                                                {sub.code}
                                              </Badge>
                                              <p className="text-xs text-muted-foreground flex-1 break-words">{sub.description}</p>
                                              <span className="text-xs text-muted-foreground shrink-0">
                                                {subQuestions.length > 0 ? `${subQuestions.length} Q` : "—"}
                                              </span>
                                            </div>
                                            {subQuestions.length > 0 && (
                                              <div className="space-y-2 mt-1 ml-4">
                                                {subQuestions.map(q => questionCard(q, sub.code))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {/* Questions not matching any defined substandard */}
                                      {coreQuestions.filter(q => {
                                        const subCodes = (ALL_SUBSTANDARDS[coreIdea] || []).map(s => s.code);
                                        return !q.standards.some(s => subCodes.includes(s.ngss_code) || (() => {
                                          const parsed = parseStandardCode(s.ngss_code);
                                          if (!parsed || parsed.level !== "HS") return false;
                                          return subCodes.includes(`MS-${parsed.discipline}${parsed.coreNum}-${s.ngss_code.match(/-(\d+)$/)?.[1]}`);
                                        })());
                                      }).length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground py-1.5">Other questions</p>
                                          <div className="space-y-2 ml-4">
                                            {coreQuestions.filter(q => {
                                              const subCodes = (ALL_SUBSTANDARDS[coreIdea] || []).map(s => s.code);
                                              return !q.standards.some(s => subCodes.includes(s.ngss_code) || (() => {
                                                const parsed = parseStandardCode(s.ngss_code);
                                                if (!parsed || parsed.level !== "HS") return false;
                                                return subCodes.includes(`MS-${parsed.discipline}${parsed.coreNum}-${s.ngss_code.match(/-(\d+)$/)?.[1]}`);
                                              })());
                                            }).map(q => questionCard(q, `${coreIdea}-other`))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Untagged section */}
            {untagged.length > 0 && (
              <Card className="mt-4">
                <CardContent className="p-5">
                  <button
                    className="w-full flex items-center gap-3 text-left"
                    onClick={() => setExpandedDiscipline(expandedDiscipline === "untagged" ? null : "untagged")}
                  >
                    <FlaskConical className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-muted-foreground">Untagged</h3>
                      <p className="text-sm text-muted-foreground">{untagged.length} question{untagged.length !== 1 ? "s" : ""}</p>
                    </div>
                    {expandedDiscipline === "untagged" ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  {expandedDiscipline === "untagged" && (
                    <div className="space-y-2 mt-4 border-t border-border pt-4">
                      {untagged.map(q => questionCard(q, "untagged"))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Flat list view */
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox checked={allFilteredSelected} onCheckedChange={selectAllFiltered} />
              <p className="text-sm text-muted-foreground">
                {allFilteredSelected ? "Deselect all" : "Select all"} · {filtered.length} question{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            {filtered.map(q => questionCard(q, "flat"))}
          </div>
        )}
      </main>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Quiz Document</DialogTitle>
            <DialogDescription>Configure your quiz export settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input id="quiz-title" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Enter quiz title..." />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="answer-key">Include Answer Key</Label>
              <Switch id="answer-key" checked={includeAnswerKey} onCheckedChange={setIncludeAnswerKey} />
            </div>
            <p className="text-sm text-muted-foreground">{selected.size} question{selected.size !== 1 ? "s" : ""} selected</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={exporting || !quizTitle.trim()}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => { if (!open) setEditingQuestion(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update question text, type, answers, and NGSS standards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 min-w-0">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4} className="break-words" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={editType} onValueChange={(val) => {
                  setEditType(val);
                  // Reset answers for new type
                  if (val === "true_false_question") {
                    setEditAnswers([
                      { id: 1, text: "True", weight: 100 },
                      { id: 2, text: "False", weight: 0 },
                    ]);
                  } else if (val === "essay_question") {
                    setEditAnswers([]);
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input type="number" min={0} value={editPoints} onChange={e => setEditPoints(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Depth of Knowledge</Label>
                <Select value={editDok !== null ? String(editDok) : "none"} onValueChange={val => setEditDok(val === "none" ? null : Number(val))}>
                  <SelectTrigger><SelectValue placeholder="Select DOK level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {DOK_LEVELS.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bloom's Taxonomy</Label>
                <Select value={editBlooms || "none"} onValueChange={val => setEditBlooms(val === "none" ? null : val)}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {BLOOMS_LEVELS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Answer editing */}
            {editType !== "essay_question" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Answers</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setEditAnswers(prev => [...prev, {
                        id: Date.now(),
                        text: "",
                        weight: 0,
                        ...(editType === "matching_question" ? { left: "", right: "" } : {}),
                      }]);
                    }}
                  >
                    + Add Answer
                  </Button>
                </div>

                <div className="space-y-2">
                  {editType === "matching_question" ? (
                    /* Matching question: left-right pairs */
                    editAnswers.map((a, idx) => (
                      <div key={a.id} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                        <Input
                          placeholder="Left side"
                          value={a.left || ""}
                          onChange={e => {
                            const updated = [...editAnswers];
                            updated[idx] = { ...updated[idx], left: e.target.value };
                            setEditAnswers(updated);
                          }}
                          className="text-sm h-8 flex-1"
                        />
                        <span className="text-muted-foreground text-xs">→</span>
                        <Input
                          placeholder="Right side"
                          value={a.right || ""}
                          onChange={e => {
                            const updated = [...editAnswers];
                            updated[idx] = { ...updated[idx], right: e.target.value };
                            setEditAnswers(updated);
                          }}
                          className="text-sm h-8 flex-1"
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => setEditAnswers(prev => prev.filter((_, i) => i !== idx))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : editType === "fill_in_multiple_blanks_question" || editType === "short_answer_question" ? (
                    /* Fill-in / Short answer: just accepted answers */
                    editAnswers.map((a, idx) => (
                      <div key={a.id} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                        <span className="text-xs text-muted-foreground shrink-0">Accepted:</span>
                        <Input
                          value={a.text}
                          onChange={e => {
                            const updated = [...editAnswers];
                            updated[idx] = { ...updated[idx], text: e.target.value, weight: 100 };
                            setEditAnswers(updated);
                          }}
                          className="text-sm h-8 flex-1"
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => setEditAnswers(prev => prev.filter((_, i) => i !== idx))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : editType === "true_false_question" ? (
                    /* True/False: radio for correct answer */
                    <RadioGroup
                      value={editAnswers.find(a => a.weight === 100)?.text || "True"}
                      onValueChange={val => {
                        setEditAnswers(prev => prev.map(a => ({ ...a, weight: a.text === val ? 100 : 0 })));
                      }}
                    >
                      {editAnswers.map(a => (
                        <div key={a.id} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                          <RadioGroupItem value={a.text} id={`tf-${a.id}`} />
                          <Label htmlFor={`tf-${a.id}`} className="text-sm flex-1 cursor-pointer">{a.text}</Label>
                          {a.weight === 100 && <Badge variant="default" className="text-xs">Correct</Badge>}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : editType === "multiple_answers_question" ? (
                    /* Multiple correct: checkboxes */
                    editAnswers.map((a, idx) => (
                      <div key={a.id} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                        <Checkbox
                          checked={a.weight > 0}
                          onCheckedChange={checked => {
                            const updated = [...editAnswers];
                            updated[idx] = { ...updated[idx], weight: checked ? 100 : 0 };
                            setEditAnswers(updated);
                          }}
                        />
                        <Input
                          value={a.text}
                          onChange={e => {
                            const updated = [...editAnswers];
                            updated[idx] = { ...updated[idx], text: e.target.value };
                            setEditAnswers(updated);
                          }}
                          className="text-sm h-8 flex-1"
                        />
                        {a.weight > 0 && <Badge variant="default" className="text-xs shrink-0">Correct</Badge>}
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => setEditAnswers(prev => prev.filter((_, i) => i !== idx))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    /* Multiple choice (single correct): radio + editable text */
                    <RadioGroup
                      value={String(editAnswers.find(a => a.weight === 100)?.id || "")}
                      onValueChange={val => {
                        setEditAnswers(prev => prev.map(a => ({ ...a, weight: String(a.id) === val ? 100 : 0 })));
                      }}
                    >
                      {editAnswers.map((a, idx) => (
                        <div key={a.id} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                          <RadioGroupItem value={String(a.id)} id={`mc-${a.id}`} />
                          <Input
                            value={a.text}
                            onChange={e => {
                              const updated = [...editAnswers];
                              updated[idx] = { ...updated[idx], text: e.target.value };
                              setEditAnswers(updated);
                            }}
                            className="text-sm h-8 flex-1"
                          />
                          {a.weight === 100 && <Badge variant="default" className="text-xs shrink-0">Correct</Badge>}
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => setEditAnswers(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>NGSS Standards</Label>
              <div className="space-y-2">
                {editStandards.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2 min-w-0">
                    <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">{s.ngss_code}</Badge>
                    <span className="text-xs text-muted-foreground flex-1 break-words">{s.ngss_description}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => removeStandard(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              {/* Searchable standard picker */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search standards (e.g. MS-ESS2-3 or 'plate')..."
                    value={standardSearch}
                    onChange={e => setStandardSearch(e.target.value)}
                    className="pl-8 text-sm h-9"
                  />
                </div>
                {standardSearch.trim() && (
                  <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                    {Object.entries(ALL_SUBSTANDARDS)
                      .flatMap(([, subs]) => subs)
                      .filter(sub => {
                        const q = standardSearch.toLowerCase();
                        return (
                          sub.code.toLowerCase().includes(q) ||
                          sub.description.toLowerCase().includes(q)
                        ) && !editStandards.some(es => es.ngss_code === sub.code);
                      })
                      .slice(0, 20)
                      .map(sub => (
                        <button
                          key={sub.code}
                          type="button"
                          className="w-full flex items-start gap-2 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                          onClick={() => {
                            setEditStandards(prev => [...prev, { ngss_code: sub.code, ngss_description: sub.description }]);
                            setStandardSearch("");
                          }}
                        >
                          <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{sub.code}</Badge>
                          <span className="text-xs text-muted-foreground">{sub.description}</span>
                        </button>
                      ))}
                    {Object.entries(ALL_SUBSTANDARDS)
                      .flatMap(([, subs]) => subs)
                      .filter(sub => {
                        const q = standardSearch.toLowerCase();
                        return (
                          sub.code.toLowerCase().includes(q) ||
                          sub.description.toLowerCase().includes(q)
                        ) && !editStandards.some(es => es.ngss_code === sub.code);
                      }).length === 0 && (
                      <p className="text-xs text-muted-foreground p-3">No matching standards found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editText.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateQuestionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={loadQuestions}
      />
    </div>
  );
};

export default QuestionBank;
