import { X, CheckCircle2, AlertTriangle } from "lucide-react";

const MessageBar = ({ type = "info", message, onClose }) => {
  if (!message) return null;

  const styles = {
    success: {
      bg: "bg-green-50 border-green-200 text-green-800",
      icon: <CheckCircle2 size={18} />,
    },
    error: {
      bg: "bg-rose-50 border-rose-200 text-rose-800",
      icon: <AlertTriangle size={18} />,
    },
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <AlertTriangle size={18} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 mb-4 ${style.bg}`}
    >
      <div className="flex items-center gap-2 font-medium">
        {style.icon}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-sm text-slate-500 hover:text-slate-700"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default MessageBar;
