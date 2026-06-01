import sys
import unittest
from pathlib import Path

_REPO = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[3],
)
sys.path.insert(0, str(_REPO / "shared" / "python"))

from display_labels import humanize_capability_label, simplify_rubric_label  # noqa: E402


class DisplayLabelTests(unittest.TestCase):
    def test_short_name_is_used_for_capability(self) -> None:
        label = humanize_capability_label(
            "Service exists and is in good condition",
            short_name="service existence",
        )
        self.assertEqual(label, "service existence")

    def test_capability_name_is_humanized_when_no_short_name(self) -> None:
        label = humanize_capability_label("Service exists and is in good condition")
        self.assertEqual(label, "service exists")

    def test_rubric_from_documentation_question(self) -> None:
        label = simplify_rubric_label(
            "Documented service or function charter",
            {
                "prompt": "Is there a documented Strategy and Planning Service Description?",
                "intent": "Evaluate whether the service description is documented",
            },
        )
        self.assertEqual(label, "Documentation")

    def test_rubric_from_enterprise_adoption_question(self) -> None:
        label = simplify_rubric_label(
            "Operating model and delivery cadence",
            {
                "prompt": "Is the service adopted enterprise wide?",
                "intent": "Evaluate enterprise-wide adoption of the service",
            },
        )
        self.assertEqual(label, "Enterprise adoption")

    def test_rubric_from_llm_label(self) -> None:
        self.assertEqual(
            simplify_rubric_label(llm_label="automation"),
            "Automation",
        )


if __name__ == "__main__":
    unittest.main()
