import * as React from "react";

interface PageBannerProps {
  greeting?: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
  children?: React.ReactNode;
  compact?: boolean;
  /** Editorial eyebrow label rendered above the title (e.g. "Curriculum") */
  eyebrow?: string;
  avatarUrl?: string;
  avatarFallback?: string;
  avatarPosition?: "left" | "right";
  avatarSize?: "default" | "large";
}

/**
 * Editorial / bento-style page header (Wix-template inspired).
 * Quiet white surface, oversized display heading, uppercase eyebrow,
 * inline stat row with hairline divider — replaces the old colored
 * "gradient-banner" card. Stays monochrome.
 */
export const PageBanner = React.forwardRef<HTMLDivElement, PageBannerProps>(function PageBanner(
  {
    greeting,
    subtitle,
    stats,
    children,
    compact = false,
    eyebrow,
    avatarUrl,
    avatarFallback,
  },
  ref,
) {
  // Derive an automatic eyebrow from the greeting if none provided ("Hello, Sara →" → "Welcome").
  const computedEyebrow = eyebrow ?? "Overview";

  return (
    <header
      ref={ref}
      className={`relative w-full ${compact ? "pb-4" : "pb-6"}`}
    >
      <div className="flex items-start justify-between gap-6">
        {/* Left: eyebrow + headline + subtitle */}
        <div className="min-w-0 flex-1">
          {computedEyebrow && (
            <p className="eyebrow">{computedEyebrow}</p>
          )}
          {greeting && (
            <h1
              className={
                "mt-2 font-extrabold tracking-tight leading-[1.02] text-foreground " +
                (compact
                  ? "text-3xl md:text-4xl"
                  : "text-4xl md:text-5xl lg:text-6xl")
              }
            >
              {greeting}
            </h1>
          )}
          {subtitle && (
            <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: avatar chip (optional) */}
        {(avatarUrl || avatarFallback) && (
          <div className="shrink-0 hidden sm:flex items-center gap-3 pt-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={avatarFallback || "avatar"}
                className="h-12 w-12 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold">
                {avatarFallback?.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats row with hairline divider above */}
      {stats && stats.length > 0 && (
        <div className="mt-8 border-t border-border pt-5 flex flex-wrap gap-x-10 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="text-2xl md:text-3xl font-extrabold tabular-nums leading-none">
                {stat.value}
              </span>
              <span className="eyebrow mt-2">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Children — typically action buttons. Render in a clean row. */}
      {children && (
        <div className={`${stats?.length ? "mt-6" : "mt-6"} flex flex-wrap items-center gap-2`}>
          {children}
        </div>
      )}

      {/* Bottom hairline that anchors the header visually */}
      <div className="mt-8 border-b border-border" />
    </header>
  );
});
