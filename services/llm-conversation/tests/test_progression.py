import unittest

from app.progression import (
    MAX_FOLLOW_UPS_PER_CAPABILITY,
    enforce_follow_up_limits,
    merge_capability_state_update,
    merge_list_values,
    merge_pending_artifacts,
)


class ProgressionTests(unittest.TestCase):
    def test_merge_list_values_appends_without_duplicates(self) -> None:
        merged = merge_list_values(["a", "b"], ["b", "c"])
        self.assertEqual(merged, ["a", "b", "c"])

    def test_merge_capability_state_update_accumulates_lists(self) -> None:
        existing = {
            "capability_id": "issp-04",
            "reference_questions_covered": ["rq-issp-04-1"],
            "dynamic_questions_asked": ["follow-up-1"],
        }
        update = {
            "capability_id": "issp-04",
            "reference_questions_covered": ["rq-issp-04-2"],
            "dynamic_questions_asked": ["follow-up-2"],
            "status": "exploring",
        }
        result = merge_capability_state_update(existing, update)
        self.assertEqual(
            result["reference_questions_covered"],
            ["rq-issp-04-1", "rq-issp-04-2"],
        )
        self.assertEqual(
            result["dynamic_questions_asked"],
            ["follow-up-1", "follow-up-2"],
        )
        self.assertEqual(result["status"], "exploring")

    def test_enforce_follow_up_limits_closes_at_max(self) -> None:
        states = {
            "issp-04": {
                "status": "exploring",
                "dynamic_questions_asked": [f"f{i}" for i in range(5)],
                "evidence_summary": "Partial evidence.",
            }
        }
        closed = enforce_follow_up_limits(states)
        self.assertEqual(closed, ["issp-04"])
        self.assertEqual(states["issp-04"]["status"], "insufficient")
        self.assertIn("Maximum follow-up", states["issp-04"]["evidence_summary"])

    def test_enforce_follow_up_limits_preserves_sufficient(self) -> None:
        states = {
            "issp-04": {
                "status": "sufficient",
                "dynamic_questions_asked": [f"f{i}" for i in range(6)],
            }
        }
        closed = enforce_follow_up_limits(states)
        self.assertEqual(closed, [])
        self.assertEqual(states["issp-04"]["status"], "sufficient")

    def test_max_follow_ups_constant(self) -> None:
        self.assertEqual(MAX_FOLLOW_UPS_PER_CAPABILITY, 5)

    def test_merge_pending_artifacts_by_id(self) -> None:
        existing = [
            {
                "id": "artifact-1",
                "label": "Security policy",
                "reason": "needs_permission",
                "status": "pending",
            }
        ]
        incoming = [
            {
                "id": "artifact-1",
                "label": "Security policy",
                "reason": "needs_permission",
                "notes": "Waiting on legal review",
                "status": "pending",
            }
        ]
        merged = merge_pending_artifacts(existing, incoming)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["notes"], "Waiting on legal review")

    def test_merge_capability_state_update_accumulates_pending_artifacts(self) -> None:
        existing = {
            "capability_id": "issp-04",
            "pending_artifacts": [
                {
                    "id": "artifact-1",
                    "label": "Security policy",
                    "reason": "needs_permission",
                    "status": "pending",
                }
            ],
        }
        update = {
            "capability_id": "issp-04",
            "pending_artifacts": [
                {
                    "id": "artifact-2",
                    "label": "Incident playbook",
                    "reason": "not_available",
                    "status": "pending",
                }
            ],
        }
        result = merge_capability_state_update(existing, update)
        self.assertEqual(len(result["pending_artifacts"]), 2)


if __name__ == "__main__":
    unittest.main()
