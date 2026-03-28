import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface CoverArtPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  onCoverUpdated: (coverUrl: string) => void;
}

export function CoverArtPicker({ open, onOpenChange, bookId, bookTitle, onCoverUpdated }: CoverArtPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState(`Book cover for "${bookTitle}"`);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToStorage = async (file: File | Blob, ext: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const filePath = `${user.id}/${bookId}-cover.${ext}`;

    // Delete existing if any
    await supabase.storage.from("book-covers").remove([filePath]);

    const { error } = await supabase.storage.from("book-covers").upload(filePath, file, {
      contentType: ext === "png" ? "image/png" : "image/jpeg",
      upsert: true,
    });
    if (error) throw error;

    const { data: publicUrl } = supabase.storage.from("book-covers").getPublicUrl(filePath);
    return publicUrl.publicUrl + `?t=${Date.now()}`;
  };

  const saveCoverUrl = async (url: string) => {
    const { error } = await supabase
      .from("library_books")
      .update({ cover_url: url } as any)
      .eq("id", bookId);
    if (error) throw error;
    onCoverUpdated(url);
    onOpenChange(false);
    toast.success("Cover art updated!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const url = await uploadToStorage(file, ext === "png" ? "png" : "jpg");
      await saveCoverUrl(url);
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.message || "Failed to upload cover image");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for the cover art");
      return;
    }

    setGenerating(true);
    setPreviewUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("generate-cover-art", {
        body: { prompt: prompt.trim(), book_title: bookTitle },
      });

      if (response.error) throw new Error(response.error.message);
      const imageBase64 = response.data?.image;
      if (!imageBase64) throw new Error("No image generated");

      // Show preview
      const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      setPreviewUrl(dataUrl);
    } catch (err: any) {
      console.error("Generation failed:", err);
      toast.error(err.message || "Failed to generate cover art");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!previewUrl) return;
    setUploading(true);
    try {
      // Convert base64 to blob
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const url = await uploadToStorage(blob, "png");
      await saveCoverUrl(url);
    } catch (err: any) {
      console.error("Save failed:", err);
      toast.error(err.message || "Failed to save cover");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Cover Art</DialogTitle>
          <DialogDescription>Upload an image or generate cover art with AI for "{bookTitle}"</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select an image</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, or WebP — max 10 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Describe the cover art you want..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={generating}
              />
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full gap-2"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate Cover Art</>
                )}
              </Button>
            </div>

            {previewUrl && (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-border aspect-[3/4] bg-muted">
                  <img src={previewUrl} alt="Generated cover" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGenerate} disabled={generating} className="flex-1">
                    Regenerate
                  </Button>
                  <Button onClick={handleSaveGenerated} disabled={uploading} className="flex-1 gap-1.5">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Use This Cover
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
