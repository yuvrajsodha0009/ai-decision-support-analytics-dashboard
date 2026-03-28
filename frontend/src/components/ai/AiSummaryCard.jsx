import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";

const extractOverviewSnippet = (markdownText) => {
  const raw = String(markdownText || "").trim();
  if (!raw) return "No summary available yet.";

  const overviewMatch = raw.match(/##\s*Overview\s*([\s\S]*?)(\n##\s|$)/i);

  const source = overviewMatch?.[1] || raw;
  const normalized = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`>#\-]+/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "No summary available yet.";
  if (normalized.length <= 260) return normalized;
  return `${normalized.slice(0, 257)}...`;
};

function AiSummaryCard({ summary, loading, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const summaryText = summary || "No summary available yet.";

  const previewText = useMemo(
    () => extractOverviewSnippet(summaryText),
    [summaryText],
  );

  const toggleExpanded = () => {
    setIsExpanded((previous) => !previous);
  };

  return (
    <div className="ai-summary-card">
      <div className="ai-summary-header">
        <h3 className="ai-summary-title">
          <Sparkles size={16} />
          Executive Insights
        </h3>

        <div className="ai-summary-actions">
          <button type="button" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={14} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {!loading && (
            <button
              type="button"
              className="ai-summary-toggle"
              onClick={toggleExpanded}
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={14} /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Expand
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="ai-summary-subtitle">Based on current filters</p>

      <div className="ai-summary-content">
        {loading ? (
          <p>Generating insights...</p>
        ) : !isExpanded ? (
          <div className="ai-summary-preview-wrap">
            <p className="ai-summary-preview-label">Overview</p>
            <p className="ai-summary-preview">{previewText}</p>
          </div>
        ) : (
          <ReactMarkdown>{summaryText}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default AiSummaryCard;
