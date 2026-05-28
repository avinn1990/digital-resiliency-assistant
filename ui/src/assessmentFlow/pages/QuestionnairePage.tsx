import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toFriendlyError } from "../../lib/userMessages";
import { getEvaluationServiceContent } from "../api";
import type {
  AssessmentDraft,
  EvaluationServiceBundle,
  EvaluationServiceSummary,
} from "../types";

type Props = {
  draft: AssessmentDraft;
  services: EvaluationServiceSummary[];
  authToken: string;
  onDraftChange: (draft: AssessmentDraft) => void;
  onFinish: () => void;
};

function nowIso() {
  return new Date().toISOString();
}

function countAnswered(responses: Record<string, string>) {
  return Object.values(responses).filter((v) => String(v ?? "").trim().length > 0)
    .length;
}

export function QuestionnairePage({
  draft,
  services,
  authToken,
  onDraftChange,
  onFinish,
}: Props) {
  const { assessmentId } = useParams();
  const selectedServiceIds = draft.selectedServiceIds;

  const initialServiceId = useMemo(() => {
    return (
      draft.currentServiceId ||
      selectedServiceIds.find((id) => !draft.responsesByService[id]?.answeredAt) ||
      selectedServiceIds[0]
    );
  }, [draft, selectedServiceIds]);

  const [activeServiceId, setActiveServiceId] = useState(initialServiceId);
  const [bundle, setBundle] = useState<EvaluationServiceBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  const responses = draft.responsesByService[activeServiceId]?.responses ?? {};

  const activeServiceMeta = useMemo(() => {
    return services.find((s) => s.service_id === activeServiceId);
  }, [services, activeServiceId]);

  const serviceProgress = useMemo(() => {
    const perService = selectedServiceIds.map((id) => {
      const answeredAt = draft.responsesByService[id]?.answeredAt;
      const answeredCount = countAnswered(draft.responsesByService[id]?.responses ?? {});
      return { id, answeredAt, answeredCount };
    });
    const done = perService.filter((s) => !!s.answeredAt).length;
    return { perService, done, total: perService.length };
  }, [draft, selectedServiceIds]);

  useEffect(() => {
    if (!assessmentId || assessmentId !== draft.assessmentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEvaluationServiceContent(activeServiceId, authToken)
      .then((data) => {
        if (cancelled) return;
        setBundle(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setBundle(null);
        setLoading(false);
        setError(toFriendlyError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [activeServiceId, assessmentId, authToken, draft.assessmentId]);

  function updateResponse(questionId: string, value: string) {
    const next: AssessmentDraft = {
      ...draft,
      updatedAt: nowIso(),
      currentServiceId: activeServiceId,
      responsesByService: {
        ...draft.responsesByService,
        [activeServiceId]: {
          ...draft.responsesByService[activeServiceId],
          responses: { ...responses, [questionId]: value },
        },
      },
    };

    onDraftChange(next);

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSavedMessage("Saved.");
      window.setTimeout(() => setSavedMessage(null), 1500);
    }, 400);
  }

  const totalQuestions = bundle?.reference_questions?.length ?? 0;
  const answeredCount = countAnswered(responses);
  const canMarkComplete = totalQuestions > 0 && answeredCount >= totalQuestions;

  function markServiceComplete() {
    const next: AssessmentDraft = {
      ...draft,
      updatedAt: nowIso(),
      currentServiceId: activeServiceId,
      responsesByService: {
        ...draft.responsesByService,
        [activeServiceId]: {
          ...draft.responsesByService[activeServiceId],
          answeredAt: nowIso(),
          responses: { ...responses },
        },
      },
    };
    onDraftChange(next);
    setSavedMessage("Service complete. You can continue now or come back later.");
  }

  function goNextService() {
    const idx = selectedServiceIds.indexOf(activeServiceId);
    const nextId = selectedServiceIds[idx + 1];
    if (nextId) {
      setActiveServiceId(nextId);
      return;
    }
    onFinish();
  }

  return (
    <div className="af-page">
      <div className="af-page-inner wide">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">
              Step 3 · Services completed {serviceProgress.done}/{serviceProgress.total}
            </div>
            <h1 className="af-h1">Answer questions</h1>
            <p className="context-help">
              Assessment ID: <span className="af-mono">{draft.assessmentId}</span>
            </p>
          </div>
          <a className="af-link" href={`/assessment/${encodeURIComponent(draft.assessmentId)}/summary`}>
            Summary
          </a>
        </div>

        <div className="af-split">
          <aside className="af-sidebar">
            <div className="af-sidebar-card">
              <div className="af-sidebar-title">Services</div>
              <div className="af-sidebar-list">
                {selectedServiceIds.map((id) => {
                  const meta = services.find((s) => s.service_id === id);
                  const answeredAt = draft.responsesByService[id]?.answeredAt;
                  const isActive = id === activeServiceId;
                  const answered = countAnswered(draft.responsesByService[id]?.responses ?? {});
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`af-sidebar-item ${isActive ? "active" : ""}`}
                      onClick={() => setActiveServiceId(id)}
                    >
                      <div className="af-sidebar-item-title">
                        {meta?.service_name ?? id}
                      </div>
                      <div className="af-sidebar-item-meta">
                        {answeredAt ? (
                          <span className="af-pill ok">Done</span>
                        ) : (
                          <span className="af-pill">{answered} answered</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="af-content">
            <div className="af-card af-card-page">
              <div className="af-service-header">
                <div>
                  <div className="af-kicker">Current service</div>
                  <div className="af-service-h2">
                    {bundle?.service_name ??
                      activeServiceMeta?.service_name ??
                      activeServiceId}
                  </div>
                  {bundle?.description && (
                    <div className="context-help">{bundle.description}</div>
                  )}
                </div>
                <div className="af-service-header-right">
                  <div className="af-pill">
                    {answeredCount}/{totalQuestions || "?"} answered
                  </div>
                  {savedMessage && <div className="af-saved">{savedMessage}</div>}
                </div>
              </div>

              {error && (
                <div className="error-banner" role="alert">
                  <strong>Couldn’t load questions.</strong> {error}
                </div>
              )}

              {loading ? (
                <div className="context-help">Loading questions…</div>
              ) : bundle ? (
                <div className="af-question-groups">
                  {bundle.reference_questions_by_capability.map((group) => (
                    <div key={group.capability_id} className="af-group">
                      <div className="af-group-title">
                        {group.capability_name}
                        <span className="af-pill">{group.capability_id}</span>
                      </div>
                      <div className="af-group-questions">
                        {group.questions.map((q) => (
                          <div key={q.id} className="af-q">
                            <div className="af-q-prompt">{q.prompt}</div>
                            {q.intent && (
                              <div className="context-help">{q.intent}</div>
                            )}
                            <textarea
                              className="af-textarea"
                              value={responses[q.id] ?? ""}
                              onChange={(e) => updateResponse(q.id, e.target.value)}
                              placeholder="Your answer…"
                              rows={3}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="af-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSavedMessage("Saved. You can close this tab and resume later.");
                  }}
                >
                  Save & continue later
                </button>

                <div className="af-spacer" />

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={markServiceComplete}
                  disabled={!canMarkComplete}
                >
                  Mark service complete
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={goNextService}
                  disabled={loading || !!error}
                >
                  Next
                </button>
              </div>
              {!canMarkComplete && totalQuestions > 0 && (
                <p className="context-help">
                  Answer all questions to mark this service complete.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

