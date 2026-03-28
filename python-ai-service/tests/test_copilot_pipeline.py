import sys
import unittest
from pathlib import Path
from unittest.mock import patch


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from models.ask_ai_model import AskAIIntent, FinalAnswerOutput  # noqa: E402
from services.insight_builder import build_insight_pack  # noqa: E402
from services.intent_service import parse_intent  # noqa: E402
from services.response_service import build_ask_ai_response  # noqa: E402


class _FakeChain:
    def __init__(self, result):
        self._result = result

    async def ainvoke(self, _payload):
        return self._result


class CopilotPipelineTests(unittest.IsolatedAsyncioTestCase):
    async def test_parse_intent_fallback_builds_router_plan_with_history(self):
        with patch("services.intent_service._build_router_chain", side_effect=RuntimeError("boom")):
            plan = await parse_intent(
                "Compare this week's revenue with the earlier trend.",
                chat_history=[
                    {"role": "user", "content": "Why did revenue dip?"},
                    {"role": "assistant", "content": "Revenue dipped sharply on 21 Mar before rebounding on 22 Mar."},
                ],
                dashboard_context={"activeContext": "revenue_chart"},
                filters={"start": "2026-03-18", "end": "2026-03-24"},
            )

        self.assertEqual(plan.query_type, "comparison")
        self.assertEqual(plan.metric, "revenue")
        self.assertEqual(plan.group_by, "date")
        self.assertIn("21 Mar", plan.conversation_context.last_answer_summary)
        self.assertGreaterEqual(plan.confidence_score, 0.55)
        self.assertIn("numbers", plan.answer_plan.required_mentions)

    async def test_parse_intent_fallback_handles_greeting_and_out_of_domain(self):
        with patch("services.intent_service._build_router_chain", side_effect=RuntimeError("boom")):
            greeting = await parse_intent("hello", chat_history=[], dashboard_context={}, filters={})
            out_of_domain = await parse_intent(
                "What's the weather today?",
                chat_history=[],
                dashboard_context={},
                filters={},
            )

        self.assertEqual(greeting.query_type, "conversational_greeting")
        self.assertEqual(out_of_domain.query_type, "out_of_domain")
        self.assertEqual(out_of_domain.answer_plan.follow_up_mode, "redirect")

    def test_build_insight_pack_creates_primary_and_summary_for_diagnostic(self):
        intent = AskAIIntent(
            metric="revenue",
            aggregation="sum",
            group_by="date",
            query_type="diagnostic",
            answer_plan={"needs_visuals": True},
        )
        raw_data = [
            {"period": "2026-03-20", "currentRevenue": 7665683.76, "currentOrders": 280},
            {"period": "2026-03-21", "currentRevenue": 4061140.52, "currentOrders": 175},
            {"period": "2026-03-22", "currentRevenue": 11633265.84, "currentOrders": 392},
        ]

        result = build_insight_pack(
            question="Why did revenue dip on 21 Mar and recover on 22 Mar?",
            intent=intent,
            execution_rows=[],
            raw_data=raw_data,
            raw_context={"filters": {"start": "2026-03-20", "end": "2026-03-22"}},
            data_source="dashboard_context",
        )

        insight_pack = result["insight_pack"]
        self.assertIn("drop", insight_pack["primary_insight"].lower())
        self.assertIn("22 Mar", " ".join(insight_pack["insight_summary"]))
        self.assertTrue(result["artifacts"]["chart"]["data"])

    def test_build_insight_pack_corrects_wrong_user_assumption(self):
        intent = AskAIIntent(
            metric="revenue",
            aggregation="sum",
            group_by="date",
            query_type="diagnostic",
            answer_plan={"needs_visuals": False},
        )
        raw_data = [
            {"period": "2026-03-20", "currentRevenue": 4061140.52, "currentOrders": 175},
            {"period": "2026-03-21", "currentRevenue": 11633265.84, "currentOrders": 392},
            {"period": "2026-03-22", "currentRevenue": 9366715.16, "currentOrders": 315},
            {"period": "2026-03-23", "currentRevenue": 8139479.40, "currentOrders": 302},
            {"period": "2026-03-24", "currentRevenue": 394553.96, "currentOrders": 18},
        ]

        result = build_insight_pack(
            question="Why did revenue drop on 21 Mar?",
            intent=intent,
            execution_rows=[],
            raw_data=raw_data,
            raw_context={"filters": {"start": "2026-03-20", "end": "2026-03-24"}},
            data_source="dashboard_context",
        )

        insight_pack = result["insight_pack"]
        self.assertIn("did not drop on 21 mar", (insight_pack["premise_validation"] or "").lower())
        self.assertEqual(insight_pack["confidence_level"], "high")
        self.assertGreaterEqual(len(insight_pack["follow_up_options"]), 2)

    def test_build_insight_pack_handles_driver_comparison(self):
        intent = AskAIIntent(
            metric="revenue",
            aggregation="sum",
            group_by="date",
            query_type="comparison",
        )
        raw_data = [
            {"period": "2026-03-20", "currentRevenue": 1000, "currentOrders": 100},
            {"period": "2026-03-21", "currentRevenue": 1300, "currentOrders": 130},
            {"period": "2026-03-22", "currentRevenue": 1350, "currentOrders": 131},
        ]

        result = build_insight_pack(
            question="Is the revenue change driven more by orders or AOV?",
            intent=intent,
            execution_rows=[],
            raw_data=raw_data,
            raw_context={"filters": {"start": "2026-03-20", "end": "2026-03-22"}},
            data_source="dashboard_context",
        )

        insight_pack = result["insight_pack"]
        self.assertIn("orders changed", insight_pack["primary_insight"].lower())
        self.assertIn("aov", insight_pack["primary_insight"].lower())
        self.assertTrue(any("orders" in row.lower() for row in insight_pack["evidence_rows"]))

    async def test_response_service_falls_back_when_final_answer_is_generic(self):
        intent = AskAIIntent(
            metric="revenue",
            aggregation="sum",
            group_by="date",
            query_type="comparison",
            confidence_score=0.81,
        )
        insight_result = {
            "artifacts": {},
            "context_used": {"filters": {"start": "2026-03-20", "end": "2026-03-22"}},
            "data_source": "dashboard_context",
            "insight_pack": {
                "premise_validation": None,
                "ai_summary": "Revenue rebounded sharply between the last two dates in view.",
                "likely_cause": "Orders expanded much faster than AOV, so volume appears to be the stronger driver.",
                "confidence_level": "high",
                "primary_insight": "Revenue moved from Rs 4,061,140.52 on 21 Mar to Rs 11,633,265.84 on 22 Mar, a delta of Rs 7,572,125.32 (186.48%).",
                "prioritized_insights": [
                    "Revenue moved from Rs 4,061,140.52 on 21 Mar to Rs 11,633,265.84 on 22 Mar, a delta of Rs 7,572,125.32 (186.48%)."
                ],
                "insight_summary": [
                    "Revenue moved from Rs 4,061,140.52 on 21 Mar to Rs 11,633,265.84 on 22 Mar, a delta of Rs 7,572,125.32 (186.48%)."
                ],
                "evidence_rows": [
                    "Latest revenue is Rs 11,633,265.84 on 22 Mar.",
                    "Window change versus 21 Mar is 186.48%.",
                ],
                "driver_signals": [],
                "anomalies": [],
                "comparisons": ["Revenue delta is Rs 7,572,125.32."],
                "recommendation_basis": [],
                "next_actions": [
                    "Break down the rebound by category.",
                    "Compare the rebound window against the surrounding dates.",
                ],
                "follow_up_options": [
                    "Do you want the rebound broken down by category?",
                    "Should I compare orders and AOV for the rebound window?",
                ],
            },
        }

        generic_output = FinalAnswerOutput(
            ai_summary="Revenue changed over time.",
            key_insight="Revenue changed over time.",
            supporting_evidence=["The data shows a movement."],
            likely_cause="",
            confidence_level=None,
            conclusion="Overall performance shifted.",
            recommendations=[],
            follow_up_suggestion=None,
            follow_up_suggestions=[],
        )

        with patch("services.response_service._build_answer_chain", return_value=_FakeChain(generic_output)):
            response = await build_ask_ai_response(
                question="Compare revenue across the last two dates.",
                intent=intent,
                raw_data=[
                    {"period": "2026-03-21", "currentRevenue": 4061140.52},
                    {"period": "2026-03-22", "currentRevenue": 11633265.84},
                ],
                raw_context={"filters": {"start": "2026-03-21", "end": "2026-03-22"}},
                insight_result=insight_result,
            )

        self.assertTrue(response["meta"]["validationFallback"])
        self.assertIn("Revenue moved from Rs 4,061,140.52", response["answer"]["primary_insight"])
        self.assertGreaterEqual(len(response["answer"]["sections"]["supporting_evidence"]), 1)
        self.assertNotEqual(response["answer"]["ai_summary"], response["answer"]["primary_insight"])
        self.assertGreaterEqual(len(response["answer"]["follow_up_suggestions"]), 1)


if __name__ == "__main__":
    unittest.main()
