import { Bot, Sparkles } from "lucide-react";
import { memo } from "react";

const FloatingAIButton = memo(function FloatingAIButton({ isOpen = false, onClick }) {
  return (
    <div className="ai-floating-button-shell">
      <button
        type="button"
        onClick={onClick}
        className={`ai-floating-button ${isOpen ? "ai-floating-button-open" : ""}`}
        aria-label="Ask AI"
      >
        <span className="ai-floating-button-glow" aria-hidden />
        <span className="relative flex items-center justify-center">
          <Bot size={22} />
          <Sparkles size={12} className="absolute -right-1 -top-1 text-cyan-100" />
        </span>
      </button>
      <span className="ai-floating-tooltip">Ask AI</span>
    </div>
  );
});

export default FloatingAIButton;
