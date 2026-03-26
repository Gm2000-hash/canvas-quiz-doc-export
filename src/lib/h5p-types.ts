export type ActivityType = "fill_in_blanks" | "drag_the_words" | "accordion" | "timeline";

export interface ActivityTypeInfo {
  type: ActivityType;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

export const ACTIVITY_TYPES: ActivityTypeInfo[] = [
  { type: "fill_in_blanks", label: "Fill in the Blanks", description: "Text with missing words that students type or select.", icon: "TextCursorInput" },
  { type: "drag_the_words", label: "Drag the Words", description: "Students drag words into blanks within sentences.", icon: "GripHorizontal" },
  { type: "accordion", label: "Accordion", description: "Vertically stacked expandable items for organizing information.", icon: "ListCollapse" },
  { type: "timeline", label: "Timeline", description: "Chronological timeline of events with text and multimedia.", icon: "Clock" },
];

// --- Fill in the Blanks ---
export interface FillInBlanksContent {
  text: string; // Use *word* to mark blanks
  acceptAlternatives: boolean;
}

// --- Drag the Words ---
export interface DragTheWordsContent {
  text: string; // Use *word* to mark draggable words
  showInstantFeedback: boolean;
}

// --- Accordion ---
export interface AccordionPanel {
  id: string;
  title: string;
  content: string;
}

export interface AccordionContent {
  panels: AccordionPanel[];
}

// --- Timeline ---
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface TimelineContent {
  headline: string;
  events: TimelineEvent[];
}

export type ActivityContent = FillInBlanksContent | DragTheWordsContent | AccordionContent | TimelineContent;

export function getDefaultContent(type: ActivityType): ActivityContent {
  switch (type) {
    case "fill_in_blanks":
      return { text: "The *sun* rises in the *east*.", acceptAlternatives: true };
    case "drag_the_words":
      return { text: "The *sun* rises in the *east* and sets in the *west*.", showInstantFeedback: true };
    case "accordion":
      return { panels: [{ id: crypto.randomUUID(), title: "Section 1", content: "Content goes here..." }] };
    case "timeline":
      return { headline: "My Timeline", events: [{ id: crypto.randomUUID(), date: "2024", title: "Event 1", description: "Description..." }] };
  }
}
