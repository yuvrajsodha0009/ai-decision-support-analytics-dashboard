import { ShoppingCart, ShoppingBag, Store, Users } from "lucide-react";
import DashboardCard from "./DashboardCard";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value || 0);

const colorByDrop = (drop) => {
  if (drop >= 50) return "text-rose-300";
  if (drop >= 30) return "text-amber-300";
  return "text-emerald-300";
};

const clampAtLeast = (value, minValue) => Math.max(Math.round(value), minValue);

const deriveFunnel = (summary) => {
  const purchases = Math.max(
    0,
    Math.round(Number(summary?.purchaseCount ?? summary?.totalOrders ?? 0))
  );

  const visitors = clampAtLeast(
    Number(
      summary?.visitorCount ??
        (purchases ? purchases / Math.max(Number(summary?.conversionRatePercentage || 3), 0.1) * 100 : 0)
    ),
    purchases
  );

  let addToCart = clampAtLeast(
    Number(summary?.addToCartCount ?? visitors * 0.4),
    purchases
  );
  let checkout = clampAtLeast(
    Number(summary?.checkoutCount ?? addToCart * 0.65),
    purchases
  );

  if (addToCart < checkout) addToCart = checkout;

  return [
    { label: "Visitors", key: "visitors", value: visitors, icon: Users },
    {
      label: "Add to Cart",
      key: "addToCart",
      value: addToCart,
      icon: ShoppingCart,
    },
    { label: "Checkout", key: "checkout", value: checkout, icon: Store },
    { label: "Purchase", key: "purchase", value: purchases, icon: ShoppingBag },
  ];
};

const FunnelSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="h-24 animate-pulse rounded-2xl border border-white/10 bg-slate-800/70"
      />
    ))}
  </div>
);

const ConversionFunnel = ({ summary, loading }) => {
  if (loading) {
    return (
      <DashboardCard className="p-6" hoverable={false}>
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Conversion Funnel</h3>
        <FunnelSkeleton />
      </DashboardCard>
    );
  }

  const steps = deriveFunnel(summary);

  return (
    <DashboardCard
      className="p-6"
      gradientClassName="bg-gradient-to-br from-indigo-500/15 via-slate-900/5 to-cyan-500/20"
      hoverable={false}
    >
      <h3 className="mb-5 text-lg font-semibold text-slate-100">Conversion Funnel</h3>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[720px] grid-cols-4 gap-4">
          {steps.map((step, index) => {
            const previousValue = steps[index - 1]?.value || step.value;
            const drop = previousValue
              ? ((previousValue - step.value) / previousValue) * 100
              : 0;
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                className="relative rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-slate-800/80 p-2 text-cyan-300">
                  <Icon size={16} />
                </div>
                <p className="text-xs uppercase tracking-wider text-slate-400">{step.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">
                  {formatNumber(step.value)}
                </p>
                {index > 0 && (
                  <p className={`mt-2 text-xs font-medium ${colorByDrop(drop)}`}>
                    {drop >= 0 ? "Drop-off" : "Lift"} {Math.abs(drop).toFixed(1)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardCard>
  );
};

export default ConversionFunnel;
