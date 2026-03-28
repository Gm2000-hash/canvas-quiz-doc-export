import { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfFlipbookViewerProps {
  fileUrl: string;
  title: string;
  onClose: () => void;
}

interface PageCoverProps {
  children: React.ReactNode;
  pageNum?: number;
}

const PageCover = forwardRef<HTMLDivElement, PageCoverProps>(({ children }, ref) => (
  <div ref={ref} className="bg-card flex items-center justify-center h-full">
    {children}
  </div>
));
PageCover.displayName = 'PageCover';

const FlipPage = forwardRef<HTMLDivElement, { pageNumber: number; width: number; height: number }>(({ pageNumber, width, height }, ref) => {
  return (
    <div ref={ref} className="bg-white flex items-center justify-center overflow-hidden relative">
      <Page
        pageNumber={pageNumber}
        width={width}
        height={height}
        renderTextLayer={false}
        renderAnnotationLayer={true}
        className="pdf-page-render [&_.react-pdf__Page__annotations]:absolute [&_.react-pdf__Page__annotations]:inset-0 [&_.react-pdf__Page__annotations]:z-[1000] [&_.react-pdf__Page__annotations_a]:pointer-events-auto"
      />
    </div>
  );
});
FlipPage.displayName = 'FlipPage';

export function PdfFlipbookViewer({ fileUrl, title, onClose }: PdfFlipbookViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate page dimensions based on container
  const getPageDimensions = useCallback(() => {
    const maxW = isFullscreen ? window.innerWidth * 0.42 : Math.min(420, window.innerWidth * 0.38);
    const maxH = isFullscreen ? window.innerHeight * 0.82 : Math.min(580, window.innerHeight * 0.72);
    // Standard US Letter ratio ~8.5:11
    const ratio = 8.5 / 11;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    return { width: Math.floor(w * scale), height: Math.floor(h * scale) };
  }, [isFullscreen, scale]);

  const { width: pageWidth, height: pageHeight } = getPageDimensions();

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoadError(null);
    setLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setLoadError(error?.message || 'Failed to load PDF');
    setLoading(false);
  }, []);

  const goToPrev = () => flipBookRef.current?.pageFlip()?.flipPrev();
  const goToNext = () => flipBookRef.current?.pageFlip()?.flipNext();

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);
  const zoomIn = () => setScale(s => Math.min(s + 0.15, 1.6));
  const zoomOut = () => setScale(s => Math.max(s - 0.15, 0.6));

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, onClose]);

  const displayPage = Math.min(currentPage + 1, numPages);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md transition-all duration-300 ${
        isFullscreen ? '' : 'p-4 md:p-8'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl shrink-0">
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={zoomOut} className="rounded-xl h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={zoomIn} className="rounded-xl h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="rounded-xl h-8 w-8">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Book area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {loading && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading PDF...</div>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-sm px-4">
              <p className="text-sm text-destructive font-medium">Failed to load PDF</p>
              <p className="text-xs text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => { setLoadError(null); setLoading(true); setNumPages(0); }}>
                Retry
              </Button>
            </div>
          </div>
        )}

        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading="" externalLinkTarget="_blank">
          {numPages > 0 && (
            <div className="flipbook-container" style={{ perspective: '2000px' }}>
              {/* @ts-ignore - react-pageflip typing issues */}
              <HTMLFlipBook
                ref={flipBookRef}
                width={pageWidth}
                height={pageHeight}
                size="fixed"
                minWidth={280}
                maxWidth={600}
                minHeight={400}
                maxHeight={800}
                showCover={true}
                maxShadowOpacity={0.4}
                mobileScrollSupport={true}
                onFlip={onFlip}
                className="flipbook-shadow"
                style={{}}
                startPage={0}
                drawShadow={true}
                flippingTime={600}
                usePortrait={false}
                startZIndex={0}
                autoSize={false}
                clickEventForward={true}
                useMouseEvents={true}
                swipeDistance={30}
                showPageCorners={true}
                disableFlipByClick={false}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <FlipPage
                    key={i}
                    pageNumber={i + 1}
                    width={pageWidth}
                    height={pageHeight}
                  />
                ))}
              </HTMLFlipBook>
            </div>
          )}
        </Document>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-center gap-4 py-3 shrink-0">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrev}
          disabled={currentPage === 0}
          className="rounded-xl h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground font-medium min-w-[80px] text-center">
          {displayPage} / {numPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          disabled={currentPage >= numPages - 1}
          className="rounded-xl h-10 w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
