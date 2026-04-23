import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { CropRect } from "@/lib/canvas-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialCrop?: CropRect | null;
  onApply: (crop: CropRect | null) => void;
};

export function CropDialog({ open, onOpenChange, imageUrl, initialCrop, onApply }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPct, setAreaPct] = useState<CropRect | null>(initialCrop || null);

  const onCropComplete = useCallback((_area: any, areaPercentage: any) => {
    setAreaPct({
      x: areaPercentage.x,
      y: areaPercentage.y,
      width: areaPercentage.width,
      height: areaPercentage.height,
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[400px] bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Zoom</span>
            <span className="text-muted-foreground">{zoom.toFixed(2)}x</span>
          </div>
          <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={([v]) => setZoom(v)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onApply(null); onOpenChange(false); }}>
            Reset
          </Button>
          <Button onClick={() => { onApply(areaPct); onOpenChange(false); }}>
            Apply crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
