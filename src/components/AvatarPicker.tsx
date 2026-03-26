import { cn } from "@/lib/utils";

import avatarDog from "@/assets/avatars/dog.png";
import avatarSquirrel from "@/assets/avatars/squirrel.png";
import avatarCat from "@/assets/avatars/cat.png";
import avatarBear from "@/assets/avatars/man.png";
import avatarWoman from "@/assets/avatars/woman.png";
import avatarTurtle from "@/assets/avatars/turtle.png";
import avatarSkateboard from "@/assets/avatars/skateboard.png";
import avatarKoala from "@/assets/avatars/koala.png";
import avatarKangaroo from "@/assets/avatars/kangaroo.png";
import avatarPenguin from "@/assets/avatars/penguin.png";
import avatarSkategirl from "@/assets/avatars/skategirl.png";
import avatarRabbit from "@/assets/avatars/rabbit.png";
import avatarPanda from "@/assets/avatars/panda.png";
import avatarElephant from "@/assets/avatars/elephant.png";

export const PRESET_AVATARS = [
  { src: avatarDog, label: "Dog" },
  { src: avatarSquirrel, label: "Squirrel" },
  { src: avatarCat, label: "Ninja Frog" },
  { src: avatarKoala, label: "Koala" },
  { src: avatarKangaroo, label: "Kangaroo" },
  { src: avatarPenguin, label: "Penguin" },
  { src: avatarSkategirl, label: "Skater Girl" },
  { src: avatarRabbit, label: "Rabbit" },
  { src: avatarPanda, label: "Panda" },
  { src: avatarElephant, label: "Elephant" },
  { src: avatarBear, label: "Bear" },
  { src: avatarWoman, label: "Woman" },
  { src: avatarTurtle, label: "Ninja Mongoose" },
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
      <div className="grid grid-cols-5 gap-3">
        {PRESET_AVATARS.map((avatar) => (
          <button
            key={avatar.label}
            type="button"
            onClick={() => onSelect(avatar.src)}
            className={cn(
              "group rounded-xl p-1.5 border-2 transition-all duration-300 hover:scale-110",
              selected === avatar.src
                ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.5)]"
                : "border-border/60 hover:border-primary/60 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4),0_0_40px_hsl(var(--accent)/0.2)]"
            )}
            title={avatar.label}
          >
            <div className="relative w-12 h-12 mx-auto rounded-2xl overflow-hidden border-[3px] border-foreground shadow-[3px_3px_0px_0px_hsl(var(--foreground))] transition-all duration-300 group-hover:rotate-3 group-hover:shadow-[3px_3px_0px_0px_hsl(var(--foreground)),0_0_12px_hsl(var(--primary)/0.6)]">
              <img src={avatar.src} alt={avatar.label} className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:saturate-[1.3]" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
