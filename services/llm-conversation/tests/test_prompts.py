import unittest

from app.prompts import build_assessment_prompt, build_turn_prompt
from app.progression import OPERATING_CONTEXT_KEY, merge_operating_context


class PromptTests(unittest.TestCase):
    def _erm_bundle(self) -> dict:
        return {
            "capabilities": {
                "service_name": "Enterprise Risk Management",
                "capabilities": [
                    {"id": "erm-01", "name": "Risk Monitoring & Visualization Technology"}
                ],
            },
            "reference_questions": {
                "capability_questions": [
                    {
                        "capability_id": "erm-01",
                        "capability_name": "Risk Monitoring & Visualization Technology",
                        "questions": [
                            {
                                "id": "rq-erm-01-1",
                                "prompt": "Does the enterprise use technology to monitor and visualize risk?",
                                "intent": "Evaluate monitoring technology",
                                "field_key": "erm_01_risk_management_platform_monitor_visualize",
                                "probe_on": ["yes", "partial"],
                                "probe_hints": ["What tools do you use today?"],
                                "dependency_type": "independent",
                            }
                        ],
                    }
                ]
            },
        }

    def test_turn_prompt_includes_operating_context_and_unlimited_probing(self) -> None:
        payload = build_turn_prompt(
            bundle=self._erm_bundle(),
            capability_states={},
            conversation=[],
            user_message=None,
            is_start=True,
            current_facts={
                OPERATING_CONTEXT_KEY: {
                    "technology_modes": ["excel_spreadsheets"],
                    "primary_subject": "service",
                }
            },
        )
        data = __import__("json").loads(payload)
        self.assertIn("operating_context", data)
        self.assertEqual(
            data["operating_context"]["technology_modes"],
            ["excel_spreadsheets"],
        )
        rules = " ".join(data["rules"])
        self.assertIn("no probe limit", rules.lower())

    def test_assessment_prompt_includes_operating_context_rules(self) -> None:
        payload = build_assessment_prompt(
            bundle=self._erm_bundle(),
            capability_states={},
            facts={
                OPERATING_CONTEXT_KEY: {
                    "technology_modes": ["excel_spreadsheets"],
                    "scope": "partial",
                }
            },
        )
        data = __import__("json").loads(payload)
        self.assertIn("assessment_rules", data)
        self.assertEqual(
            data["operating_context"]["technology_modes"],
            ["excel_spreadsheets"],
        )
        self.assertTrue(
            any("technology_modes" in rule for rule in data["assessment_rules"])
        )


class OperatingContextMergeTests(unittest.TestCase):
    def test_merge_preserves_existing_subject_when_adding_modes(self) -> None:
        merged = merge_operating_context(
            {"primary_subject": "service"},
            {"technology_modes": ["excel_spreadsheets"]},
        )
        self.assertEqual(merged["primary_subject"], "service")
        self.assertEqual(merged["technology_modes"], ["excel_spreadsheets"])


if __name__ == "__main__":
    unittest.main()
