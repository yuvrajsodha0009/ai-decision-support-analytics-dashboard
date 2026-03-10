import DashboardCard from "./DashboardCard";

const ChartSkeleton = ({ className = "" }) => (
  <div
    className={`h-full w-full animate-pulse rounded-xl bg-gradient-to-r from-slate-800/70 via-slate-700/60 to-slate-800/70 ${className}`}
  />
);

const ChartContainer = ({
  title,
  subtitle = "",
  actions = null,
  loading = false,
  error = "",
  className = "",
  contentClassName = "",
  gradientClassName = "bg-gradient-to-br from-cyan-500/15 via-slate-900/10 to-indigo-500/15",
  children,
}) => {
  return (
    <DashboardCard
      className={`p-6 ${className}`}
      gradientClassName={gradientClassName}
      hoverable={false}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {loading && <ChartSkeleton className={contentClassName || "h-72"} />}
      {!loading && error && <p className="text-sm text-rose-300">{error}</p>}
      {!loading && !error && (
        <div className={`animate-fadeIn ${contentClassName}`}>{children}</div>
      )}
    </DashboardCard>
  );
};

export default ChartContainer;
