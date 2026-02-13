const SettingsTabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-selected={isActive}
            className={`flex min-w-[160px] items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition md:min-w-0 ${
              isActive
                ? "border-cyan-300 bg-cyan-50 text-slate-900 shadow-lg shadow-cyan-200/60 dark:border-cyan-400/60 dark:bg-white/5 dark:text-white dark:shadow-cyan-500/10"
                : "border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:border-cyan-400/40 dark:hover:text-slate-100"
            }`}
          >
            {Icon && (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isActive
                    ? "bg-gradient-to-br from-cyan-400 to-teal-500 text-black"
                    : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300"
                }`}
              >
                <Icon size={18} />
              </span>
            )}
            <div>
              <p className="text-sm font-semibold">{tab.label}</p>
              {tab.caption && (
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {tab.caption}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SettingsTabs;
