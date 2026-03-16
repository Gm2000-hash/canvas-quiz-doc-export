import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PdfFlipbookViewer } from '@/components/PdfFlipbookViewer';
import { FileText, BookOpenCheck } from 'lucide-react';

interface LibraryBook {
  id: string;
  title: string;
  file_path: string;
  file_size: number;
}

export function HomeBookShelf() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [viewingBook, setViewingBook] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    supabase
      .from('library_books')
      .select('id, title, file_path, file_size')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBooks(data);
      });
  }, []);

  if (books.length === 0) return null;

  const openBook = (book: LibraryBook) => {
    const { data } = supabase.storage.from('library-pdfs').getPublicUrl(book.file_path);
    setViewingBook({ title: book.title, url: data.publicUrl });
  };

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpenCheck className="h-4 w-4 text-earth-terracotta" />
          <h2 className="text-lg font-semibold text-foreground">Reading Library</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {books.map(book => (
            <button
              key={book.id}
              onClick={() => openBook(book)}
              className="shrink-0 w-28 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              {/* Book cover */}
              <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 border border-border/60 flex items-center justify-center relative overflow-hidden transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1 group-active:scale-[0.97]">
                <FileText className="h-8 w-8 text-primary/30" />
                {/* Spine */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/25 rounded-l-xl" />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
    </>
  );
}
