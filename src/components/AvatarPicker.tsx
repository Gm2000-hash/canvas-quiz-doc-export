import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import avatarDog from "@/assets/avatars/dog.png";
import avatarSquirrel from "@/assets/avatars/squirrel.png";
import avatarCat from "@/assets/avatars/cat.png";
import avatarButterfly from "@/assets/avatars/butterfly.png";
import avatarSun from "@/assets/avatars/sun.png";
import avatarFish from "@/assets/avatars/fish.png";
import avatarBear from "@/assets/avatars/man.png";
import avatarWoman from "@/assets/avatars/woman.png";
import avatarTurtle from "@/assets/avatars/turtle.png";
import avatarSkateboard from "@/assets/avatars/skateboard.png";
import avatarTree from "@/assets/avatars/tree.png";

export const PRESET_AVATARS = [
  { src: avatarDog, label: "Dog" },
  { src: avatarSquirrel, label: "Squirrel" },
  { src: avatarCat, label: "Cat" },
  { src: avatarButterfly, label: "Deer" },
  { src: avatarSun, label: "Snake" },
  { src: avatarTree, label: "Tree" },
  { src: avatarFish, label: "Fish" },
  { src: avatarBear, label: "Bear" },
  { src: avatarWoman, label: "Woman" },
  { src: avatarTurtle, label: "Turtle" },
  { src: avatarSkateboard, label: "Skateboard" },
] as const;

interface AvatarPickerProps {
  selected: string;
  onSelect: (url: string) => void;
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Or choose an avatar</p>
      <div className="grid grid-cols-5 gap-2">
        {PRESET_AVATARS.map((avatar) => (
          <button
            key={avatar.label}
            type="button"
            onClick={() => onSelect(avatar.src)}
            className={cn(
              "rounded-xl p-1.5 border-2 transition-all hover:scale-105",
              selected === avatar.src
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border/60 hover:border-border"
            )}
            title={avatar.label}
          >
            <div className="relative w-12 h-12 mx-auto rounded-2xl overflow-hidden border-[3px] border-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-transform hover:rotate-2">
              <img src={avatar.src} alt={avatar.label} className="w-full h-full object-cover" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
