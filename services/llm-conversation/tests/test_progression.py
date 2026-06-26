import unittest

from app.progression import (
    OPERATING_CONTEXT_KEY,
    build_progression_constraints,
    enforce_follow_up_limits,
    merge_capability_state_update,
    merge_list_values,
    merge_operating_context,
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

    def test_enforce_follow_up_limits_is_no_op(self) -> None:
        states = {
            "erm-01": {
                "status": "exploring",
                "dynamic_questions_asked": [f"f{i}" for i in range(12)],
                "evidence_summary": "Partial evidence.",
            }
        }
        closed = enforce_follow_up_limits(states)
        self.assertEqual(closed, [])
        self.assertEqual(states["erm-01"]["status"], "exploring")

    def test_build_progression_constraints_reports_unlimited_probing(self) -> None:
        constraints = build_progression_constraints(
            {
                "erm-01": {
                    "status": "exploring",
                    "dynamic_questions_asked": ["probe-1", "probe-2"],
                }
            }
        )
        self.assertTrue(constraints["follow_ups_unlimited"])
        self.assertEqual(
            constraints["capabilities_with_active_probing"],
            [{"capability_id": "erm-01", "probes_asked": 2}],
        )

    def test_merge_operating_context_merges_lists_and_scalars(self) -> None:
        existing = {
            "primary_subject": "service",
            "technology_modes": ["excel_spreadsheets"],
            "scope": "partial",
        }
        incoming = {
            "technology_modes": ["shared_drive"],
            "automation_level": "partial_macros",
        }
        merged = merge_operating_context(existing, incoming)
        self.assertEqual(merged["primary_subject"], "service")
        self.assertEqual(
            merged["technology_modes"],
            ["excel_spreadsheets", "shared_drive"],
        )
        self.assertEqual(merged["automation_level"], "partial_macros")

    def test_operating_context_key_constant(self) -> None:
        self.assertEqual(OPERATING_CONTEXT_KEY, "operating_context")

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
