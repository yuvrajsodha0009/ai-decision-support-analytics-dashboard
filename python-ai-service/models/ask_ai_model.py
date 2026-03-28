from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


MetricType = Literal["revenue", "orders"]
AggregationType = Literal["sum", "count", "avg"]
GroupByType = Literal["category", "region", "date", "none"]
SortType = Literal["asc", "desc"]
ChartType = Literal["bar", "line", "pie", "none"]
DateRangeType = Literal["today", "last_7_days", "this_month", "custom"]
QueryType = Literal[
    "aggregation",
    "diagnostic",
    "comparison",
    "pattern",
    "recommendation",
    "conversational_greeting",
    "out_of_domain",
]
RecommendationModeType = Literal["none", "optional", "required"]
ToneType = Literal["direct_analytical", "measured_analytical", "redirect_supportive"]
FollowUpModeType = Literal["none", "optional", "redirect"]
DataSourceType = Literal["mongo", "dashboard_context", "hybrid", "minimal_context"]
ConfidenceLevelType = Literal["low", "medium", "high"]


class IntentFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date_range: DateRangeType | None = None
    region: str | None = None
    category: str | None = None


class ConversationContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_goal: str = ""
    active_metric_or_dimension: str = ""
    referenced_periods: list[str] = Field(default_factory=list)
    last_answer_summary: str = ""
    open_follow_up: str = ""


class AnswerPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    response_goal: str = ""
    evidence_priority: list[str] = Field(default_factory=list)
    comparison_axes: list[str] = Field(default_factory=list)
    required_mentions: list[str] = Field(default_factory=list)
    recommendation_mode: RecommendationModeType = "optional"
    tone: ToneType = "direct_analytical"
    needs_visuals: bool = False
    follow_up_mode: FollowUpModeType = "optional"


class AskAIIntent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    metric: MetricType = "revenue"
    aggregation: AggregationType = "sum"
    group_by: GroupByType = "none"
    filters: IntentFilters = Field(default_factory=IntentFilters)
    sort: SortType = "desc"
    limit: int | None = Field(default=None, ge=1, le=100)
    chart_type: ChartType = "none"
    query_type: QueryType = "aggregation"
    conversation_context: ConversationContext = Field(default_factory=ConversationContext)
    answer_plan: AnswerPlan = Field(default_factory=AnswerPlan)
    confidence_score: float = Field(default=0.65, ge=0.0, le=1.0)


class ChartPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    value: float


class ChartArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chartType: Literal["bar", "line", "pie"]
    title: str
    data: list[ChartPoint]


class TableArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[str]
    rows: list[list[Any]]


class CopilotArtifacts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chart: ChartArtifact | None = None
    table: TableArtifact | None = None


class AnswerSections(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key_insight: str
    supporting_evidence: list[str] = Field(default_factory=list)
    conclusion: str
    recommendations: list[str] = Field(default_factory=list)


class FinalAnswerOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ai_summary: str
    key_insight: str
    supporting_evidence: list[str] = Field(default_factory=list)
    likely_cause: str | None = None
    confidence_level: ConfidenceLevelType | None = None
    conclusion: str
    recommendations: list[str] = Field(default_factory=list)
    follow_up_suggestion: str | None = None
    follow_up_suggestions: list[str] = Field(default_factory=list)


class CopilotAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["text", "chart"] = "text"
    ai_summary: str
    primary_insight: str
    prioritized_insights: list[str] = Field(default_factory=list)
    likely_cause: str | None = None
    confidence_level: ConfidenceLevelType | None = None
    sections: AnswerSections
    follow_up_suggestion: str | None = None
    follow_up_suggestions: list[str] = Field(default_factory=list)
    content: str


class InsightPack(BaseModel):
    model_config = ConfigDict(extra="forbid")

    primary_insight: str
    prioritized_insights: list[str] = Field(default_factory=list)
    premise_validation: str | None = None
    ai_summary: str | None = None
    likely_cause: str | None = None
    confidence_level: ConfidenceLevelType | None = None
    insight_summary: list[str] = Field(default_factory=list)
    evidence_rows: list[str] = Field(default_factory=list)
    driver_signals: list[str] = Field(default_factory=list)
    anomalies: list[str] = Field(default_factory=list)
    comparisons: list[str] = Field(default_factory=list)
    recommendation_basis: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    follow_up_options: list[str] = Field(default_factory=list)


class QueryExecuted(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str
    metric: MetricType
    aggregation: AggregationType
    grouping: GroupByType
    query_type: QueryType
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class AskAIResponseEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal["v2"] = "v2"
    answer: CopilotAnswer
    artifacts: CopilotArtifacts = Field(default_factory=CopilotArtifacts)
    context_used: dict[str, Any] = Field(default_factory=dict)
    query_executed: QueryExecuted
    insight_pack: InsightPack
    data_source: DataSourceType = "dashboard_context"
    meta: dict[str, Any] = Field(default_factory=dict)
