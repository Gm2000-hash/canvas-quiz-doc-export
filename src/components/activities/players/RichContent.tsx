import DOMPurify from "dompurify";

interface Props {
  html: string;
  className?: string;
}

/**
 * Renders rich text HTML content safely using DOMPurify-sanitized markup.
 * Falls back to plain text display if content doesn't contain HTML tags.
 */
export function RichContent({ html, className = "" }: Props) {
  const isHTML = /<[a-z][\s\S]*>/i.test(html);

  if (!isHTML) {
    return <p className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${className}`}>{html}</p>;
  }

  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "frameborder", "allow", "src", "target"],
  });

  return (
    <div
      className={`prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}