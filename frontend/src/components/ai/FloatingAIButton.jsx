import { Bot, Sparkles } from "lucide-react";
import { memo } from "react";

const FloatingAIButton = memo(function FloatingAIButton({
  isOpen = false,
  onClick,
}) {
  return (
    <div className="ai-floating-button-shell">
      <button
        type="button"
        onClick={onClick}
        className={`ai-floating-button ${isOpen ? "ai-floating-button-open" : ""}`}
        aria-label="Ask AI"
      >
        <span className="ai-floating-button-glow" aria-hidden />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Bot size={22} />
          <Sparkles size={12} className="absolute -right-0.5 -top-0.5 text-cyan-100" />
        </span>
      </button>

      <span className="ai-floating-tooltip">
        Ask AI
      </span>
    </div>
  );
});

export default FloatingAIButton;
