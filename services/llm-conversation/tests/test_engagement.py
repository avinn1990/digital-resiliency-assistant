import unittest

from app.engagement import (
    CHECKPOINT_INTERVAL,
    build_capability_topic_progress,
    build_engagement_context,
    build_pause_reply,
    build_pillar_progress,
    build_resume_recap,
    detect_pause_intent,
    detect_possible_fatigue,
    update_engagement_metrics,
)
from app.store import LlmSession


def _sample_bundle() -> dict:
    return {
        "capabilities": {
            "service_id": "test-service",
            "service_name": "Test Service",
            "capabilities": [
                {
                    "id": "cap-1",
                    "name": "Capability One",
                    "pillar": "Process/Service",
                },
                {
                    "id": "cap-2",
                    "name": "Capability Two",
                    "pillar": "Process/Service",
                },
                {
                    "id": "cap-3",
                    "name": "Capability Three",
                    "pillar": "Technology",
                },
            ],
        },
        "reference_questions": {
            "capability_questions": [
                {
                    "capability_id": "cap-1",
                    "questions": [{"id": "q1"}, {"id": "q2"}, {"id": "q3"}],
                },
                {
                    "capability_id": "cap-2",
                    "questions": [{"id": "q4"}],
                },
            ],
        },
    }


def _sample_session(**overrides) -> LlmSession:
    states = {
        "cap-1": {
            "status": "sufficient",
            "reference_questions_covered": ["q1", "q2"],
        },
        "cap-2": {
            "status": "exploring",
            "reference_questions_covered": ["q4"],
        },
        "cap-3": {"status": "not_started", "reference_questions_covered": []},
    }
    session = LlmSession(
        session_id="sess-1",
        framework_id="test-service",
        service_id="test-service",
        capability_states=states,
        messages=[{"role": "assistant", "content": "Hello"}],
    )
    for key, value in overrides.items():
        setattr(session, key, value)
    return session


class EngagementTests(unittest.TestCase):
    def test_detect_pause_intent(self) -> None:
        self.assertTrue(detect_pause_intent("I need to pause for now"))
        self.assertTrue(detect_pause_intent("let's take a break"))
        self.assertTrue(detect_pause_intent("pause"))
        self.assertFalse(detect_pause_intent("We pause incidents during maintenance"))

    def test_build_engagement_context_checkpoint(self) -> None:
        bundle = _sample_bundle()
        session = _sample_session()
        context = build_engagement_context(bundle, session)
        self.assertEqual(context["capabilities_resolved"], 1)
        self.assertEqual(context["capabilities_remaining"], 2)
        self.assertEqual(context["active_capability_questions_covered"], 1)
        self.assertEqual(context["active_capability_reference_total"], 1)

    def test_should_offer_checkpoint_every_four(self) -> None:
        bundle = _sample_bundle()
        states = {
            f"cap-{i}": {"status": "sufficient", "reference_questions_covered": []}
            for i in range(1, 5)
        }
        session = _sample_session(capability_states=states)
        context = build_engagement_context(bundle, session)
        self.assertTrue(context["should_offer_checkpoint"])
        self.assertEqual(CHECKPOINT_INTERVAL, 4)

    def test_build_capability_topic_progress(self) -> None:
        bundle = _sample_bundle()
        session = _sample_session()
        progress = build_capability_topic_progress(
            bundle, session.capability_states, "cap-1"
        )
        self.assertEqual(progress, {"covered": 2, "total": 3})

    def test_build_pillar_progress(self) -> None:
        bundle = _sample_bundle()
        session = _sample_session()
        pillar = build_pillar_progress(bundle, session.capability_states, "cap-2")
        self.assertIsNotNone(pillar)
        assert pillar is not None
        self.assertEqual(pillar["pillar"], "Process/Service")
        self.assertEqual(pillar["resolved_in_pillar"], 1)
        self.assertEqual(pillar["total_in_pillar"], 2)
        self.assertFalse(pillar["pillar_complete"])

    def test_detect_possible_fatigue(self) -> None:
        session = _sample_session(user_message_lengths=[8, 6, 5])
        self.assertTrue(detect_possible_fatigue(session))
        session.user_message_lengths = [40, 35, 30]
        self.assertFalse(detect_possible_fatigue(session))

    def test_update_engagement_metrics_truncates(self) -> None:
        session = _sample_session(user_message_lengths=[10] * 15)
        update_engagement_metrics(session, "short")
        self.assertEqual(len(session.user_message_lengths), 12)

    def test_build_pause_reply_includes_progress(self) -> None:
        reply = build_pause_reply(
            "Test Service",
            {"current": 2, "total": 5},
            {"capability_name": "Access reviews"},
        )
        self.assertIn("2 of 5", reply)
        self.assertIn("Access reviews", reply)

    def test_build_resume_recap(self) -> None:
        bundle = _sample_bundle()
        session = _sample_session()
        recap = build_resume_recap(
            bundle,
            session,
            {"capability_name": "Capability Two"},
        )
        self.assertIn("Welcome back", recap)
        self.assertIn("Test Service", recap)


if __name__ == "__main__":
    unittest.main()
