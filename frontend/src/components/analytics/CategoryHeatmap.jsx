import { useMemo } from "react";
import { formatCurrency, formatNumber } from "../../utils/analyticsFormatters";
import ChartContainer from "../dashboard/ChartContainer";

const resolveCellColor = (value, min, max) => {
  const safeValue = Number(value || 0);
  if (max <= min) return "rgba(34, 211, 238, 0.24)";
  const ratio = (safeValue - min) / (max - min);
  const alpha = 0.2 + ratio * 0.65;
  return `rgba(34, 211, 238, ${alpha.toFixed(3)})`;
};

const CategoryHeatmap = ({ data, loading = false, error = "" }) => {
  const regions = Array.isArray(data?.regions) ? data.regions : [];
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const rawCells = data?.cells;
  const maxRevenue = Number(data?.maxRevenue || 0);
  const minRevenue = Number(data?.minRevenue || 0);
  const cellLookup = useMemo(() => {
    const map = new Map();
    const cells = Array.isArray(rawCells) ? rawCells : [];
    cells.forEach((cell) => {
      const key = `${cell?.category}::${cell?.region}`;
      map.set(key, {
        revenue: Number(cell?.revenue || 0),
        orders: Number(cell?.orders || 0),
      });
    });
    return map;
  }, [rawCells]);

  return (
    <ChartContainer
      title="Category Heatmap"
      subtitle="Category vs region revenue intensity"
      loading={loading}
      error={error}
      contentClassName="h-[320px]"
      gradientClassName="bg-gradient-to-br from-indigo-500/16 via-slate-900/8 to-cyan-500/14"
      className="p-4 sm:p-5"
    >
      {regions.length === 0 || categories.length === 0 ? (
        <p className="text-sm text-slate-400">No category heatmap data for the selected filters.</p>
      ) : (
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Category
                </th>
                {regions.map((region) => (
                  <th
                    key={region}
                    className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {region}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((row) => (
                <tr key={row.category} className="border-b border-white/5">
                  <td className="px-2 py-3 text-xs font-medium text-slate-100">{row.category}</td>
                  {regions.map((region) => {
                    const value = Number(row.values?.[region] || 0);
                    const cellMeta = cellLookup.get(`${row.category}::${region}`);
                    const orders = Number(cellMeta?.orders || 0);
                    return (
                      <td
                        key={`${row.category}-${region}`}
                        title={`${row.category} - ${region}\nRevenue: ${formatCurrency(value)}\nOrders: ${formatNumber(orders)}`}
                        className="px-2 py-3 text-right text-xs text-slate-100"
                        style={{
                          backgroundColor: resolveCellColor(value, minRevenue, maxRevenue),
                        }}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartContainer>
  );
};

export default CategoryHeatmap;
