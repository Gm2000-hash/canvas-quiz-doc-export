import type { ActivityType, ActivityContent } from "@/lib/h5p-types";
import { FillInBlanksPlayer } from "./players/FillInBlanksPlayer";
import { DragTheWordsPlayer } from "./players/DragTheWordsPlayer";
import { AccordionPlayer } from "./players/AccordionPlayer";
import { TimelinePlayer } from "./players/TimelinePlayer";
import type { FillInBlanksContent, DragTheWordsContent, AccordionContent, TimelineContent } from "@/lib/h5p-types";

interface Props {
  type: ActivityType;
  content: ActivityContent;
}

export function ActivityPlayer({ type, content }: Props) {
  switch (type) {
    case "fill_in_blanks":
      return <FillInBlanksPlayer content={content as FillInBlanksContent} />;
    case "drag_the_words":
      return <DragTheWordsPlayer content={content as DragTheWordsContent} />;
    case "accordion":
      return <AccordionPlayer content={content as AccordionContent} />;
    case "timeline":
      return <TimelinePlayer content={content as TimelineContent} />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown activity type.</p>;
  }
}
