import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imageUrl: string;
  onCropped: (newUrl: string, w: number, h: number) => void;
};

const ASPECTS: Record<string, number | undefined> = {
  free: undefined,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

export function ImageCropDialog({ open, onOpenChange, imageUrl, onCropped }: Props) {
  const { user } = useAuth();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState<string>("free");
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setAreaPx(areaPixels);
  }, []);

  const apply = async () => {
    if (!user) { toast.error("Sign in required"); return; }
    if (!areaPx) { toast.error("Adjust the crop first"); return; }
    setBusy(true);
    try {
      const blob = await renderCroppedBlob(imageUrl, areaPx, rotation);
      const path = `${user.id}/floating/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage.from("wallpapers").upload(path, blob, {
        upsert: false,
        contentType: "image/png",
      });
      if (error) throw error;
      const { data } = await supabase.storage.from("wallpapers").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = data?.signedUrl;
      if (!url) throw new Error("Could not get image URL");
      onCropped(url, Math.round(areaPx.width), Math.round(areaPx.height));
      onOpenChange(false);
      toast.success("Image cropped");
    } catch (e: any) {
      toast.error(e.message || "Crop failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Crop image</DialogTitle></DialogHeader>
        <div className="relative h-[420px] bg-muted rounded-md overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECTS[aspectKey]}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            restrictPosition={false}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Aspect ratio</Label>
            <Select value={aspectKey} onValueChange={setAspectKey}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(ASPECTS).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Zoom <span className="text-muted-foreground">{zoom.toFixed(2)}×</span></Label>
            <Slider value={[zoom]} min={0.5} max={5} step={0.05} onValueChange={([v]) => setZoom(v)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Rotation <span className="text-muted-foreground">{rotation}°</span></Label>
            <Slider value={[rotation]} min={-180} max={180} step={1} onValueChange={([v]) => setRotation(v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={apply} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Apply crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- helpers ----
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function renderCroppedBlob(src: string, area: Area, rotation: number): Promise<Blob> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = img.width * cos + img.height * sin;
  const rotH = img.width * sin + img.height * cos;

  // Render rotated image onto a working canvas
  const work = document.createElement("canvas");
  work.width = rotW;
  work.height = rotH;
  const wctx = work.getContext("2d")!;
  wctx.translate(rotW / 2, rotH / 2);
  wctx.rotate(rad);
  wctx.drawImage(img, -img.width / 2, -img.height / 2);

  // Crop the rotated canvas with area (in pixel coords of the rotated image)
  const out = document.createElement("canvas");
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  const octx = out.getContext("2d")!;
  octx.drawImage(
    work,
    Math.round(area.x), Math.round(area.y), Math.round(area.width), Math.round(area.height),
    0, 0, out.width, out.height,
  );
  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(b => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/png");
  });
}
