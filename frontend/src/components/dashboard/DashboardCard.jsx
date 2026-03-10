const DashboardCard = ({
  children,
  className = "",
  gradientClassName = "",
  hoverable = true,
}) => {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 shadow-xl backdrop-blur-xl ${
        hoverable
          ? "transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-950/30"
          : ""
      } ${className}`}
    >
      {gradientClassName && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 opacity-35 ${gradientClassName}`}
        />
      )}
      <div className="relative z-10">{children}</div>
    </section>
  );
};

export default DashboardCard;
