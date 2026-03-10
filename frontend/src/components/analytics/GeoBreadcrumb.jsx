import { ChevronRight } from "lucide-react";

const GeoBreadcrumb = ({ items = [], activeLevel = "world", onNavigate }) => {
  const crumbs = Array.isArray(items) && items.length > 0
    ? items
    : [{ level: "world", label: "World" }];

  return (
    <nav
      aria-label="Geographic drilldown breadcrumb"
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-300"
    >
      {crumbs.map((crumb, index) => {
        const isActive = crumb.level === activeLevel || index === crumbs.length - 1;
        const key = `${crumb.level}-${crumb.label}-${index}`;

        return (
          <span key={key} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight size={12} className="text-slate-500" />}
            {isActive ? (
              <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-cyan-100">
                {crumb.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate?.(crumb.level)}
                className="rounded-md border border-white/10 bg-slate-900/70 px-2 py-1 text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-100"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default GeoBreadcrumb;
