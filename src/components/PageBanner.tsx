import { ReactNode } from "react";

interface PageBannerProps {
  greeting?: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
  children?: ReactNode;
  compact?: boolean;
}

export function PageBanner({ greeting, subtitle, stats, children, compact = false }: PageBannerProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-earth-warm border border-earth-sand ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      {/* Abstract shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large circle top-right */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-earth-terracotta/10" />
        {/* Medium circle bottom-left */}
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-earth-sage/10" />
        {/* Small rectangle rotated */}
        <div className="absolute top-6 right-1/4 w-16 h-16 rounded-xl bg-earth-terracotta/[0.06] rotate-12" />
        {/* Tiny circle */}
        <div className="absolute bottom-4 right-1/3 w-8 h-8 rounded-full bg-earth-moss/10" />
        {/* Horizontal bar */}
        <div className="absolute top-1/2 -left-4 w-24 h-3 rounded-full bg-earth-sage/[0.06] -rotate-6" />
        {/* Dot cluster */}
        <div className="absolute top-3 left-1/3 w-3 h-3 rounded-full bg-earth-clay/10" />
        <div className="absolute top-8 left-[38%] w-2 h-2 rounded-full bg-earth-terracotta/10" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {greeting && (
          <h1 className={`font-bold text-earth-clay ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}>
            {greeting}
          </h1>
        )}
        {subtitle && (
          <p className="text-sm text-earth-moss mt-1">{subtitle}</p>
        )}

        {stats && stats.length > 0 && (
          <div className={`flex flex-wrap gap-4 sm:gap-6 ${greeting ? "mt-4" : ""}`}>
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-earth-clay tabular-nums">
                  {stat.value}
                </span>
                <span className="text-xs text-earth-moss font-medium mt-0.5">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {children && <div className={greeting || stats ? "mt-4" : ""}>{children}</div>}
      </div>
    </div>
  );
}
