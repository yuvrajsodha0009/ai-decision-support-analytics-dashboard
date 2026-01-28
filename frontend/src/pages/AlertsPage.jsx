import { AlertTriangle, CheckCircle2, Info, Shield, Clock } from "lucide-react";

const sampleAlerts = [
  {
    id: 1,
    title: "API error rate spiked",
    severity: "high",
    description: "Error rate exceeded 5% in the last 15 minutes on the ingestion service.",
    timestamp: "5 min ago",
    owner: "SRE",
  },
  {
    id: 2,
    title: "Delayed CSV uploads",
    severity: "medium",
    description: "Average processing time for CSV uploads is 2x baseline.",
    timestamp: "22 min ago",
    owner: "Data Ops",
  },
  {
    id: 3,
    title: "KPI target achieved",
    severity: "low",
    description: "Weekly revenue target hit early; review forecast adjustments.",
    timestamp: "1 hr ago",
    owner: "Finance",
  },
  {
    id: 4,
    title: "Anomaly detected in traffic",
    severity: "high",
    description: "Unusual traffic pattern observed from APAC region.",
    timestamp: "2 hrs ago",
    owner: "Analytics",
  },
];

const severityStyles = {
  high: "bg-red-500/10 border-red-400/60 text-red-100",
  medium: "bg-amber-400/10 border-amber-300/60 text-amber-100",
  low: "bg-emerald-400/10 border-emerald-300/60 text-emerald-100",
};

const severityIcon = (level) => {
  if (level === "high") return <AlertTriangle size={18} />;
  if (level === "medium") return <Info size={18} />;
  return <CheckCircle2 size={18} />;
};

const AlertsPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
          <Shield size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Alerts Center</h1>
          <p className="text-slate-400 text-sm">Stay ahead of incidents, anomalies, and key milestones.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {sampleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-2xl p-5 flex flex-col gap-3 backdrop-blur bg-white/5 border-white/10 hover:border-indigo-400/50 transition-all ${severityStyles[alert.severity]}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-xs font-semibold uppercase tracking-wide">
                {severityIcon(alert.severity)}
                {alert.severity} priority
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-200">
                <Clock size={14} />
                {alert.timestamp}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-semibold leading-snug">{alert.title}</h2>
              <p className="text-slate-200 text-sm mt-1 leading-relaxed">{alert.description}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-200">
              <span>Owner: {alert.owner}</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition">Acknowledge</button>
                <button className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition">Create task</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPage;
