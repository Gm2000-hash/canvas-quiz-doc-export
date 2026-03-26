export type ActivityType =
  | "fill_in_blanks" | "drag_the_words" | "accordion" | "timeline"
  | "multiple_choice" | "true_false" | "single_choice_set" | "mark_the_words"
  | "essay" | "summary"
  | "dialog_cards" | "flashcards" | "memory_game"
  | "arithmetic_quiz" | "drag_and_drop" | "question_set" | "personality_quiz" | "game_map";

export interface ActivityTypeInfo {
  type: ActivityType;
  label: string;
  description: string;
  category: "content" | "quiz" | "game";
}

export const ACTIVITY_TYPES: ActivityTypeInfo[] = [
  // Content & Structure
  { type: "accordion", label: "Accordion", description: "Vertically stacked expandable items.", category: "content" },
  { type: "timeline", label: "Timeline", description: "Chronological events with text and media.", category: "content" },
  // Quiz types
  { type: "fill_in_blanks", label: "Fill in the Blanks", description: "Text with missing words to type or select.", category: "quiz" },
  { type: "drag_the_words", label: "Drag the Words", description: "Drag words into blanks within sentences.", category: "quiz" },
  { type: "multiple_choice", label: "Multiple Choice", description: "Questions with multiple correct answers possible.", category: "quiz" },
  { type: "true_false", label: "True/False", description: "Simple true or false questions.", category: "quiz" },
  { type: "single_choice_set", label: "Single Choice Set", description: "Quick-fire single-answer questions.", category: "quiz" },
  { type: "mark_the_words", label: "Mark the Words", description: "Highlight correct words in a text.", category: "quiz" },
  { type: "essay", label: "Essay", description: "Essay with keyword-based auto-feedback.", category: "quiz" },
  { type: "summary", label: "Summary", description: "Select key statements to build a summary.", category: "quiz" },
  { type: "arithmetic_quiz", label: "Arithmetic Quiz", description: "Timed math quizzes with auto-generated problems.", category: "quiz" },
  { type: "drag_and_drop", label: "Drag and Drop", description: "Drag items onto designated drop zones.", category: "quiz" },
  { type: "question_set", label: "Question Set", description: "Combine multiple question types into one quiz.", category: "quiz" },
  // Games
  { type: "dialog_cards", label: "Dialog Cards", description: "Two-sided turning cards for review.", category: "game" },
  { type: "flashcards", label: "Flashcards", description: "Classic term/definition flashcards.", category: "game" },
  { type: "memory_game", label: "Memory Game", description: "Match pairs of cards.", category: "game" },
  { type: "personality_quiz", label: "Personality Quiz", description: "Map answers to personality profiles.", category: "game" },
  { type: "game_map", label: "Game Map", description: "Stage-based game on a visual map.", category: "game" },
];

// ─── Content types ─────────────────────────────────────

// Fill in the Blanks
export interface FillInBlanksContent { text: string; acceptAlternatives: boolean; }

// Drag the Words
export interface DragTheWordsContent { text: string; showInstantFeedback: boolean; }

// Accordion
export interface AccordionPanel { id: string; title: string; content: string; }
export interface AccordionContent { panels: AccordionPanel[]; }

// Timeline
export interface TimelineEvent { id: string; date: string; title: string; description: string; imageUrl?: string; }
export interface TimelineContent { headline: string; events: TimelineEvent[]; }

// Multiple Choice
export interface MCOption { id: string; text: string; correct: boolean; }
export interface MultipleChoiceContent { question: string; options: MCOption[]; multiAnswer: boolean; }

// True/False
export interface TrueFalseContent { statement: string; correctAnswer: boolean; feedback?: string; }

// Single Choice Set
export interface SCQuestion { id: string; question: string; options: string[]; correctIndex: number; }
export interface SingleChoiceSetContent { questions: SCQuestion[]; }

// Mark the Words
export interface MarkTheWordsContent { text: string; /* *correct* words wrapped in asterisks */ }

// Essay
export interface EssayKeyword { text: string; caseSensitive: boolean; }
export interface EssayContent { question: string; keywords: EssayKeyword[]; maxWords?: number; }

// Summary
export interface SummaryGroup { id: string; statements: string[]; correctIndex: number; }
export interface SummaryContent { intro: string; groups: SummaryGroup[]; }

// Dialog Cards
export interface DialogCard { id: string; front: string; back: string; }
export interface DialogCardsContent { cards: DialogCard[]; }

// Flashcards
export interface Flashcard { id: string; term: string; definition: string; imageUrl?: string; }
export interface FlashcardsContent { cards: Flashcard[]; }

// Memory Game
export interface MemoryPair { id: string; cardA: string; cardB: string; }
export interface MemoryGameContent { pairs: MemoryPair[]; }

// Arithmetic Quiz
export interface ArithmeticQuizContent {
  operations: ("add" | "subtract" | "multiply" | "divide")[];
  maxNumber: number;
  questionCount: number;
  timeLimit: number; // seconds
}

// Drag and Drop
export interface DnDItem { id: string; label: string; }
export interface DnDZone { id: string; label: string; correctItemIds: string[]; }
export interface DragAndDropContent { items: DnDItem[]; zones: DnDZone[]; }

// Question Set (meta-container)
export interface QuestionSetItem { id: string; type: ActivityType; content: any; }
export interface QuestionSetContent { questions: QuestionSetItem[]; passPercentage: number; }

// Personality Quiz
export interface PersonalityProfile { id: string; name: string; description: string; }
export interface PQOption { text: string; profileScores: Record<string, number>; }
export interface PQQuestion { id: string; question: string; options: PQOption[]; }
export interface PersonalityQuizContent { profiles: PersonalityProfile[]; questions: PQQuestion[]; }

// Game Map
export interface GameMapStage { id: string; label: string; x: number; y: number; type: ActivityType; content: any; }
export interface GameMapContent { title: string; stages: GameMapStage[]; }

export type ActivityContent =
  | FillInBlanksContent | DragTheWordsContent | AccordionContent | TimelineContent
  | MultipleChoiceContent | TrueFalseContent | SingleChoiceSetContent | MarkTheWordsContent
  | EssayContent | SummaryContent
  | DialogCardsContent | FlashcardsContent | MemoryGameContent
  | ArithmeticQuizContent | DragAndDropContent | QuestionSetContent | PersonalityQuizContent | GameMapContent;

export function getDefaultContent(type: ActivityType): ActivityContent {
  switch (type) {
    case "fill_in_blanks": return { text: "The *sun* rises in the *east*.", acceptAlternatives: true };
    case "drag_the_words": return { text: "The *sun* rises in the *east* and sets in the *west*.", showInstantFeedback: true };
    case "accordion": return { panels: [{ id: crypto.randomUUID(), title: "Section 1", content: "Content goes here..." }] };
    case "timeline": return { headline: "My Timeline", events: [{ id: crypto.randomUUID(), date: "2024", title: "Event 1", description: "Description..." }] };
    case "multiple_choice": return { question: "What is 2 + 2?", options: [{ id: crypto.randomUUID(), text: "3", correct: false }, { id: crypto.randomUUID(), text: "4", correct: true }, { id: crypto.randomUUID(), text: "5", correct: false }], multiAnswer: false };
    case "true_false": return { statement: "The Earth orbits the Sun.", correctAnswer: true, feedback: "" };
    case "single_choice_set": return { questions: [{ id: crypto.randomUUID(), question: "What color is the sky?", options: ["Red", "Blue", "Green"], correctIndex: 1 }] };
    case "mark_the_words": return { text: "The *mitochondria* is the *powerhouse* of the *cell*." };
    case "essay": return { question: "Explain photosynthesis.", keywords: [{ text: "sunlight", caseSensitive: false }, { text: "chlorophyll", caseSensitive: false }], maxWords: 200 };
    case "summary": return { intro: "Select the correct statement in each group.", groups: [{ id: crypto.randomUUID(), statements: ["Correct statement", "Wrong statement A", "Wrong statement B"], correctIndex: 0 }] };
    case "dialog_cards": return { cards: [{ id: crypto.randomUUID(), front: "Term", back: "Definition" }] };
    case "flashcards": return { cards: [{ id: crypto.randomUUID(), term: "Photosynthesis", definition: "The process by which plants convert sunlight into energy." }] };
    case "memory_game": return { pairs: [{ id: crypto.randomUUID(), cardA: "H₂O", cardB: "Water" }, { id: crypto.randomUUID(), cardA: "NaCl", cardB: "Salt" }] };
    case "arithmetic_quiz": return { operations: ["add", "subtract"], maxNumber: 20, questionCount: 10, timeLimit: 60 };
    case "drag_and_drop": return { items: [{ id: crypto.randomUUID(), label: "Item 1" }], zones: [{ id: crypto.randomUUID(), label: "Zone A", correctItemIds: [] }] };
    case "question_set": return { questions: [], passPercentage: 70 };
    case "personality_quiz": return { profiles: [{ id: crypto.randomUUID(), name: "Type A", description: "Description..." }], questions: [{ id: crypto.randomUUID(), question: "Question?", options: [] }] };
    case "game_map": return { title: "My Game", stages: [] };
  }
}
