/**
 * SSR-safe HTML → plain text.
 *
 * The exporters in this folder may run on the server (TanStack Start) or in
 * the browser, so we cannot rely on `document.createElement`. This is a
 * lightweight regex-based stripper — good enough for Canvas question bodies
 * which are simple HTML.
 */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  // Drop script / style / iframe blocks wholesale
  s = s.replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, " ");
  // Drop self-closing media tags
  s = s.replace(/<(img|br|hr)\b[^>]*\/?>/gi, " ");
  // Convert block-level closing tags to spaces so words don't run together
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|td|th)>/gi, " ");
  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, " ");
  // Decode the handful of entities Canvas commonly emits
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ");
  // Collapse whitespace
  return s.replace(/\s+/g, " ").trim();
}

export function escapeXml(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function safeFilename(input: string): string {
  return (input || "export").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "export";
}
