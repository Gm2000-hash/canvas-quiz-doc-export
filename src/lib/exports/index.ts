/**
 * Portable Canvas-quiz exporters.
 *
 * This folder is self-contained: zero imports from the host app, only npm
 * packages (`docx`, `file-saver`, `jszip`). Copy the entire `exports/` folder
 * into another project and it works as-is.
 *
 * See README.md for the full porting guide.
 */
export * from "./portable-types";
export { exportQuizToDocx } from "./quiz-to-docx";
export type { ExportQuizToDocxOptions } from "./quiz-to-docx";
export { exportToQTI } from "./quiz-to-qti";
export type { ExportToQTIOptions } from "./quiz-to-qti";
export {
  exportMasteryConnectCSV,
  exportMasteryConnectDetailCSV,
} from "./mastery-connect-csv";
export type { MasteryConnectExportOptions } from "./mastery-connect-csv";
export { stripHtml, escapeXml, safeFilename } from "./strip-html";
