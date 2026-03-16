import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { AppNavSheet } from '@/components/AppNavSheet';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PdfFlipbookViewer } from '@/components/PdfFlipbookViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { BookOpen, Upload, Loader2, Trash2, FileText } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface LibraryBook {
  id: string;
  title: string;
  file_path: string;
  file_size: number;
  page_count: number;
  created_at: string;
}

export default function Library() {
  const { user } = useAuth();
  const { isAdmin, loading: profileLoading } = useProfile();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingBook, setViewingBook] = useState<LibraryBook | null>(null);

  const fetchBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('library_books')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch books:', error);
    } else {
      setBooks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profileLoading && isAdmin) fetchBooks();
  }, [fetchBooks, profileLoading, isAdmin]);

  // Wait for profile to load before redirecting
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB');
      return;
    }

    setUploading(true);
    try {
      const filePath = `shared/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('library-pdfs')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const title = file.name.replace(/\.pdf$/i, '');
      const { error: insertError } = await supabase
        .from('library_books')
        .insert({
          user_id: user.id,
          title,
          file_path: filePath,
          file_size: file.size,
        });

      if (insertError) throw insertError;

      toast.success(`"${title}" added to the shared library`);
      fetchBooks();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload PDF');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (book: LibraryBook) => {
    if (!confirm(`Delete "${book.title}" from the shared library?`)) return;
    try {
      await supabase.storage.from('library-pdfs').remove([book.file_path]);
      await supabase.from('library_books').delete().eq('id', book.id);
      setBooks(prev => prev.filter(b => b.id !== book.id));
      toast.success('Book removed');
    } catch {
      toast.error('Failed to delete book');
    }
  };

  const openBook = (book: LibraryBook) => {
    const { data } = supabase.storage.from('library-pdfs').getPublicUrl(book.file_path);
    setViewingBook({ ...book, file_path: data.publicUrl });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <Breadcrumbs items={[{ label: "Manage Library" }]} />
      </header>

      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Shared Library</h1>
              <p className="text-sm text-muted-foreground mt-1">Upload PDFs that appear on all teachers' home screens</p>
            </div>
            <div>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                id="pdf-upload"
                disabled={uploading}
              />
              <Button asChild disabled={uploading} className="gap-2">
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload PDF
                    </>
                  )}
                </label>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : books.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No books yet</h3>
                <p className="text-sm text-muted-foreground">Upload a PDF to share it with all teachers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map(book => (
                <Card
                  key={book.id}
                  className="group cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 overflow-hidden"
                  onClick={() => openBook(book)}
                >
                  <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center relative">
                    <FileText className="h-10 w-10 text-primary/40" />
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary/20" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleDelete(book); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-foreground truncate">{book.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatSize(book.file_size)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {viewingBook && (
        <PdfFlipbookViewer
          fileUrl={viewingBook.file_path}
          title={viewingBook.title}
          onClose={() => setViewingBook(null)}
        />
      )}
    </div>
  );
}
