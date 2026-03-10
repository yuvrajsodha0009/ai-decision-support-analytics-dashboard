import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Label,
} from "recharts";
import ChartContainer from "./ChartContainer";

const COLORS = ["#22d3ee", "#38bdf8", "#818cf8", "#14b8a6", "#60a5fa"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const DeviceSplitChart = ({ data, loading, error }) => {
  const totalRevenue = data.reduce((sum, row) => sum + Number(row.totalRevenue || 0), 0);

  return (
    <ChartContainer
      title="Device Split"
      subtitle="Donut breakdown of revenue by device type"
      loading={loading}
      error={error}
      contentClassName="h-[360px]"
      gradientClassName="bg-gradient-to-br from-cyan-500/18 via-slate-900/8 to-violet-500/18"
    >
      <div className="grid h-full grid-rows-[1fr_auto] gap-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="totalRevenue"
              nameKey="device"
              innerRadius={72}
              outerRadius={118}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.device} fill={COLORS[index % COLORS.length]} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null;
                  const { cx, cy } = viewBox;
                  return (
                    <g>
                      <text
                        x={cx}
                        y={cy - 10}
                        textAnchor="middle"
                        fill="#94a3b8"
                        style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}
                      >
                        Total
                      </text>
                      <text
                        x={cx}
                        y={cy + 14}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        style={{ fontSize: "16px", fontWeight: 700 }}
                      >
                        {formatCurrency(totalRevenue)}
                      </text>
                    </g>
                  );
                }}
              />
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {data.map((row, index) => {
            const share = totalRevenue ? (Number(row.totalRevenue || 0) / totalRevenue) * 100 : 0;
            return (
              <div
                key={row.device}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {row.device}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-100">
                  {formatCurrency(row.totalRevenue)}
                </p>
                <p className="text-xs text-slate-400">{formatPercent(share)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </ChartContainer>
  );
};

export default DeviceSplitChart;
