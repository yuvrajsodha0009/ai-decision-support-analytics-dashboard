import DashboardCard from "../dashboard/DashboardCard";

const AnalyticsSectionCard = ({
  title,
  subtitle = "",
  badge = null,
  icon: Icon = null,
  className = "",
  children,
}) => {
  return (
    <DashboardCard
      className={`p-5 sm:p-6 ${className}`}
      gradientClassName="bg-gradient-to-br from-cyan-500/10 via-slate-900/6 to-indigo-500/10"
      hoverable={false}
    >
      {(title || subtitle || badge) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && (
              <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-100">
                {Icon && (
                  <span className="rounded-md border border-white/10 bg-slate-900/70 p-1 text-slate-300">
                    <Icon size={13} />
                  </span>
                )}
                {title}
              </h2>
            )}
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          {badge}
        </div>
      )}
      {children}
    </DashboardCard>
  );
};

export default AnalyticsSectionCard;
