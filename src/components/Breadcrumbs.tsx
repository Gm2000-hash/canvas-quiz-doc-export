import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm min-w-0">
      <Link
        to="/"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          {item.path ? (
            <Link
              to={item.path}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[140px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
