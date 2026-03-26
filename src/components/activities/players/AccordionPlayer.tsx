import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { AccordionContent as AccordionData } from "@/lib/h5p-types";

interface Props {
  content: AccordionData;
}

export function AccordionPlayer({ content }: Props) {
  return (
    <Accordion type="multiple" className="w-full">
      {content.panels.map((panel) => (
        <AccordionItem key={panel.id} value={panel.id}>
          <AccordionTrigger className="text-sm font-medium">{panel.title}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">
            {panel.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
