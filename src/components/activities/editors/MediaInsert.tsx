import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Music, Image as ImageIcon, X, Plus } from "lucide-react";
import type { MediaEmbed } from "@/lib/h5p-types";

interface MediaInsertProps {
  media?: MediaEmbed;
  onChange: (media?: MediaEmbed) => void;
}

const TYPE_ICONS = { audio: Music, video: Video, image: ImageIcon } as const;

export function MediaInsert({ media, onChange }: MediaInsertProps) {
  const [adding, setAdding] = useState(false);

  if (!media && !adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-7 text-muted-foreground"
        onClick={() => setAdding(true)}
      >
        <Plus className="h-3 w-3 mr-1" /> Add media
      </Button>
    );
  }

  const currentType = media?.type || "video";
  const currentUrl = media?.url || "";
  const Icon = TYPE_ICONS[currentType];

  return (
    <div className="border border-dashed border-border/60 rounded-lg p-3 space-y-2 bg-muted/20">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Label className="text-xs font-medium text-muted-foreground">Media Embed</Label>
        <div className="flex-1" />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive"
          onClick={() => { onChange(undefined); setAdding(false); }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Select
          value={currentType}
          onValueChange={(v) => onChange({ url: currentUrl, type: v as MediaEmbed["type"] })}
        >
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="flex-1 h-8 text-xs"
          placeholder="Paste URL (YouTube, Vimeo, MP3, MP4, etc.)"
          value={currentUrl}
          onChange={(e) => onChange({ url: e.target.value, type: currentType as MediaEmbed["type"] })}
        />
      </div>
      {/* Preview */}
      {currentUrl && (
        <MediaPreview url={currentUrl} type={currentType as MediaEmbed["type"]} />
      )}
    </div>
  );
}

function MediaPreview({ url, type }: { url: string; type: MediaEmbed["type"] }) {
  // Detect YouTube/Vimeo for embed
  const youtubeId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/)?.[1];
  const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];

  if (type === "video") {
    if (youtubeId) {
      return (
        <div className="aspect-video rounded-md overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            allowFullScreen
          />
        </div>
      );
    }
    if (vimeoId) {
      return (
        <div className="aspect-video rounded-md overflow-hidden bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <video src={url} controls className="w-full rounded-md max-h-48" preload="metadata" />
    );
  }

  if (type === "audio") {
    return <audio src={url} controls className="w-full h-10" preload="metadata" />;
  }

  if (type === "image") {
    return <img src={url} alt="Media" className="w-full rounded-md max-h-48 object-contain" />;
  }

  return null;
}
