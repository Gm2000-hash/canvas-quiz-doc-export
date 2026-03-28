import { pdfjs } from 'react-pdf';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

let workerConfigured = false;

export function ensurePdfWorker() {
  if (workerConfigured) return;

  pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  workerConfigured = true;
}
