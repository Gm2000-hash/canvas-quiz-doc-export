import * as React from "react";

interface PageBannerProps {
  greeting?: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
  children?: React.ReactNode;
  compact?: boolean;
  avatarUrl?: string;
  avatarFallback?: string;
  avatarPosition?: "left" | "right";
  avatarSize?: "default" | "large";
}

export const PageBanner = React.forwardRef<HTMLDivElement, PageBannerProps>(function PageBanner(
  {
    greeting,
    subtitle,
    stats,
    children,
    compact = false,
    avatarUrl,
    avatarFallback,
    avatarPosition = "left",
    avatarSize = "default",
  },
  ref,
) {
  const sizeClass = avatarSize === "large"
    ? "h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32"
    : compact ? "h-10 w-10" : "h-14 w-14 sm:h-16 sm:w-16";

  const avatarEl = avatarUrl !== undefined ? (
    <div className={`relative ${sizeClass} rounded-2xl overflow-hidden border-4 border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))] transition-transform hover:rotate-2 shrink-0`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-secondary flex items-center justify-center">
          <span className="text-primary font-semibold">{avatarFallback || "?"}</span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl gradient-banner border border-border bg-white ${compact ? "p-5" : "p-6 sm:p-8"}`}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-accent/8" />
        <div className="absolute top-6 right-1/4 w-16 h-16 rounded-xl bg-neon-yellow/8 rotate-12" />
        <div className="absolute bottom-4 right-1/3 w-8 h-8 rounded-full bg-neon-green/10" />
        <div className="absolute top-1/2 -left-4 w-24 h-3 rounded-full bg-neon-cyan/6 -rotate-6" />
        <div className="absolute top-3 left-1/3 w-3 h-3 rounded-full bg-neon-orange/12" />
        <div className="absolute top-8 left-[38%] w-2 h-2 rounded-full bg-accent/10" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 sm:gap-6">
          {avatarPosition === "left" && avatarEl}
          <div className="flex-1 min-w-0 text-left pl-2 sm:pl-4 lg:pl-8">
            {greeting && (
              <h1 className={`font-bold text-foreground ${compact ? "text-xl" : "text-2xl sm:text-3xl lg:text-4xl"}`}>
                {greeting}
              </h1>
            )}
            {subtitle && (
              <p className="text-base sm:text-lg mt-1 text-card-foreground">{subtitle}</p>
            )}
          </div>
          {avatarPosition === "right" && (
            <div className="shrink-0 mr-8 sm:mr-20 lg:mr-32">
              {avatarEl}
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className={`flex flex-wrap gap-4 sm:gap-6 ${greeting || avatarUrl ? "mt-4" : ""}`}>
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold tabular-nums text-card-foreground">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground font-medium mt-0.5">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {children && <div className={`pl-2 sm:pl-4 lg:pl-8 ${greeting || stats ? "mt-4" : ""}`}>{children}</div>}
      </div>
    </div>
  );
});