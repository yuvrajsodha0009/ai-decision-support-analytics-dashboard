const selectClassName =
  "h-9 rounded-lg border border-white/10 bg-slate-900/70 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-cyan-400/60";
const labelClassName = "text-[10px] uppercase tracking-wide text-slate-400";

const toOptions = (values = []) => (Array.isArray(values) ? values : []);

const AdvancedFiltersPanel = ({
  isOpen = false,
  filters,
  options,
  loading = false,
  onFilterChange,
}) => {
  if (!isOpen) return null;

  const countries = toOptions(options?.countries);
  const states = toOptions(options?.states);
  const categories = toOptions(options?.categories);
  const products = toOptions(options?.products);
  const segments = toOptions(options?.segments);
  const channels = toOptions(options?.channels);

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-300">Advanced Filters</p>
        <p className="text-[11px] text-slate-400">{loading ? "Refreshing options..." : "Optional drill-down filters"}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Country</span>
          <select
            value={filters.country}
            onChange={(event) => onFilterChange("country", event.target.value)}
            className={selectClassName}
          >
            <option value="">All Countries</option>
            {countries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClassName}>State</span>
          <select
            value={filters.state}
            onChange={(event) => onFilterChange("state", event.target.value)}
            className={selectClassName}
          >
            <option value="">All States</option>
            {states.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Product Category</span>
          <select
            value={filters.category}
            onChange={(event) => onFilterChange("category", event.target.value)}
            className={selectClassName}
          >
            <option value="">All Categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Product</span>
          <select
            value={filters.product}
            onChange={(event) => onFilterChange("product", event.target.value)}
            className={selectClassName}
          >
            <option value="">All Products</option>
            {products.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Customer Segment</span>
          <select
            value={filters.segment}
            onChange={(event) => onFilterChange("segment", event.target.value)}
            className={selectClassName}
          >
            <option value="">All Segments</option>
            {segments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Sales Channel</span>
          <select
            value={filters.channel}
            onChange={(event) => onFilterChange("channel", event.target.value)}
            className={selectClassName}
          >
            <option value="">All Channels</option>
            {channels.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};

export default AdvancedFiltersPanel;
