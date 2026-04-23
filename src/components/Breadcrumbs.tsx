import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

/**
 * Editorial breadcrumbs — uppercase tracked eyebrow with thin slashes,
 * matches the bento header system.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold min-w-0 py-3">
      <Link
        to="/"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        aria-label="Home"
      >
        <Home className="h-3 w-3" />
        <span className="hidden sm:inline">Home</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground/50 select-none">/</span>
          {item.path ? (
            <Link
              to={item.path}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground truncate max-w-[220px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
