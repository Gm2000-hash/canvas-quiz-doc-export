import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PdfFlipbookViewer } from '@/components/PdfFlipbookViewer';
import { CurriculumReadingViewer } from '@/components/CurriculumReadingViewer';
import { FileText, BookOpenCheck } from 'lucide-react';
import { toast } from 'sonner';

interface LibraryBook {
  id: string;
  title: string;
  file_path: string;
  file_size: number;
  source_discipline: string | null;
  cover_url: string | null;
}

export const HomeBookShelf = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function HomeBookShelf(
  { className, ...props },
  ref,
) {
  const [books, setBooks] = React.useState<LibraryBook[]>([]);
  const [viewingBook, setViewingBook] = React.useState<{ title: string; url: string } | null>(null);
  const [viewingCurriculum, setViewingCurriculum] = React.useState<{ title: string; discipline: string } | null>(null);
  const [openingId, setOpeningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase
      .from('library_books')
      .select('id, title, file_path, file_size, source_discipline, cover_url')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load library books:', error);
          return;
        }

        if (data) setBooks(data as LibraryBook[]);
      });
  }, []);

  if (books.length === 0) return null;

  const openBook = async (book: LibraryBook) => {
    // Curriculum-backed book
    if (book.source_discipline) {
      setViewingCurriculum({ title: book.title, discipline: book.source_discipline });
      return;
    }

    // PDF book
    setOpeningId(book.id);
    try {
      const { data, error } = await supabase.storage
        .from('library-pdfs')
        .createSignedUrl(book.file_path, 60 * 30);

      if (error || !data?.signedUrl) throw error;
      setViewingBook({ title: book.title, url: data.signedUrl });
    } catch (error) {
      console.error('Failed to open library book:', error);
      toast.error('Failed to open PDF');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div ref={ref} className={className} {...props}>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpenCheck className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Reading Library</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => openBook(book)}
              disabled={openingId === book.id}
              className="shrink-0 w-28 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl disabled:opacity-70"
            >
              <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 border border-border/60 flex items-center justify-center relative overflow-hidden transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1 group-active:scale-[0.97]">
                {openingId === book.id ? (
                  <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                ) : book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <FileText className="h-8 w-8 text-primary/30" />
                )}
                {!book.cover_url && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/25 rounded-l-xl" />}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {book.source_discipline && (
                  <div className="absolute bottom-1.5 right-1.5 rounded bg-primary/20 px-1 py-0.5 text-[9px] font-medium text-primary">
                    Curriculum
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-foreground mt-2 truncate px-0.5">{book.title}</p>
            </button>
          ))}
        </div>
      </div>

      {viewingBook && (
        <PdfFlipbookViewer
          fileUrl={viewingBook.url}
          title={viewingBook.title}
          onClose={() => setViewingBook(null)}
        />
      )}

      {viewingCurriculum && (
        <CurriculumReadingViewer
          discipline={viewingCurriculum.discipline}
          title={viewingCurriculum.title}
          onClose={() => setViewingCurriculum(null)}
        />
      )}
    </div>
  );
});
