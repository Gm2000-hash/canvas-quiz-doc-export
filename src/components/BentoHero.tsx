import * as React from "react";
import { ArrowUpRight } from "lucide-react";

export interface BentoHeroAction {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "ink" | "ghost";
}

export interface BentoHeroStat {
  label: string;
  value: string | number;
}

export interface BentoHeroSideTile {
  /** Visual variant — 'lilac' / 'peach' / 'sky' / 'coral' / 'white' / 'ink' / 'default' */
  variant?: "lilac" | "peach" | "sky" | "coral" | "white" | "ink" | "default";
  eyebrow?: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: BentoHeroAction;
}

interface BentoHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  stats?: BentoHeroStat[];
  primaryAction?: BentoHeroAction;
  secondaryActions?: BentoHeroAction[];
  /** Up to 2 side tiles rendered in the right column on desktop. */
  sideTiles?: BentoHeroSideTile[];
}

const tileClass = (v?: BentoHeroSideTile["variant"]) => {
  switch (v) {
    case "lilac": return "bento-tile bento-tile--lilac";
    case "peach": return "bento-tile bento-tile--peach";
    case "sky":   return "bento-tile bento-tile--sky";
    case "coral": return "bento-tile bento-tile--coral";
    case "ink":   return "bento-tile bento-tile--ink";
    case "white": return "bento-tile bento-tile--white";
    default:      return "bento-tile";
  }
};

/**
 * Editorial bento hero — drop-in replacement for PageBanner on
 * top-level pages that want the Wix-template look. Hero tile on
 * the left (giant headline + stats + CTAs), 1–2 accent tiles on
 * the right.
 */
export function BentoHero({
  eyebrow,
  title,
  subtitle,
  stats,
  primaryAction,
  secondaryActions = [],
  sideTiles = [],
}: BentoHeroProps) {
  const renderAction = (a: BentoHeroAction, key: string) => {
    const Icon = a.icon;
    return (
      <button
        key={key}
        onClick={a.onClick}
        className={"pill-btn " + (a.variant === "ink" ? "pill-btn--ink" : "")}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {a.label}
        {a.variant === "ink" && !Icon && <ArrowUpRight className="h-3.5 w-3.5" />}
      </button>
    );
  };

  return (
    <section className="grid grid-cols-12 gap-4 md:gap-5 mb-8">
      {/* Hero tile */}
      <div className="col-span-12 lg:col-span-8 bento-tile bento-tile--lilac min-h-[340px] flex flex-col justify-between">
        <div>
          <p className="eyebrow" style={{ color: "hsl(var(--brand-ink) / 0.7)" }}>
            {eyebrow}
          </p>
          <h1 className="display-xl mt-3">{title}</h1>
          {subtitle && (
            <p className="mt-5 text-base md:text-lg max-w-xl leading-relaxed"
               style={{ color: "hsl(var(--brand-ink) / 0.75)" }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          {stats && stats.length > 0 && (
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-3xl md:text-4xl font-extrabold tabular-nums leading-none">
                    {s.value}
                  </p>
                  <p className="eyebrow mt-2" style={{ color: "hsl(var(--brand-ink) / 0.7)" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {primaryAction && renderAction({ ...primaryAction, variant: "ink" }, "primary")}
            {secondaryActions.map((a, i) => renderAction(a, `s${i}`))}
          </div>
        </div>
      </div>

      {/* Side tiles column */}
      <div className="col-span-12 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5">
        {sideTiles.slice(0, 2).map((t, i) => (
          <div
            key={i}
            className={tileClass(t.variant) + " min-h-[160px] flex flex-col justify-between"}
          >
            <div>
              {t.eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-80">
                  {t.eyebrow}
                </p>
              )}
              <p className="mt-2 text-2xl md:text-3xl font-extrabold leading-tight">
                {t.title}
              </p>
              {t.body && (
                <p className="mt-2 text-sm leading-relaxed opacity-90">{t.body}</p>
              )}
            </div>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="self-start mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-neutral-100 transition-colors"
                style={{ color: t.variant === "coral" ? "hsl(var(--brand-coral))" : "hsl(var(--brand-ink))" }}
              >
                {t.action.icon && <t.action.icon className="h-3 w-3" />}
                {t.action.label}
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
