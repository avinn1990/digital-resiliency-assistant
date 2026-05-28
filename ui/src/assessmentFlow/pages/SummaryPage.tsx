import { useMemo } from "react";
import type { AssessmentDraft, EvaluationServiceSummary } from "../types";

type Props = {
  draft: AssessmentDraft;
  services: EvaluationServiceSummary[];
  onDiscard: () => void;
};

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function countAnswered(responses: Record<string, string>) {
  return Object.values(responses).filter((v) => String(v ?? "").trim().length > 0)
    .length;
}

export function SummaryPage({ draft, services, onDiscard }: Props) {
  const byService = useMemo(() => {
    return draft.selectedServiceIds.map((id) => {
      const meta = services.find((s) => s.service_id === id);
      const svc = draft.responsesByService[id];
      const answered = countAnswered(svc?.responses ?? {});
      return {
        id,
        name: meta?.service_name ?? id,
        done: !!svc?.answeredAt,
        answered,
      };
    });
  }, [draft, services]);

  const allDone = byService.every((s) => s.done);

  return (
    <div className="af-page">
      <div className="af-page-inner">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Step 4</div>
            <h1 className="af-h1">Summary</h1>
            <p className="context-help">
              Assessment ID: <span className="af-mono">{draft.assessmentId}</span>
            </p>
          </div>
          <a className="af-link" href={`/assessment/${encodeURIComponent(draft.assessmentId)}/questions`}>
            Back to questions
          </a>
        </div>

        <div className="af-grid-2">
          <div className="af-card af-card-page">
            <h2 className="af-h2">Profile</h2>
            <div className="af-kv">
              <div className="af-k">Company</div>
              <div className="af-v">{draft.profile.company}</div>
              <div className="af-k">Role</div>
              <div className="af-v">{draft.profile.role}</div>
              <div className="af-k">Username</div>
              <div className="af-v">{draft.profile.username}</div>
              <div className="af-k">Full name</div>
              <div className="af-v">{draft.profile.fullName}</div>
            </div>

            <h2 className="af-h2">Services</h2>
            <div className="af-summary-services">
              {byService.map((s) => (
                <div key={s.id} className="af-summary-service">
                  <div className="af-summary-service-title">{s.name}</div>
                  <div className="af-summary-service-meta">
                    {s.done ? (
                      <span className="af-pill ok">Complete</span>
                    ) : (
                      <span className="af-pill">In progress</span>
                    )}
                    <span className="af-pill">{s.answered} answered</span>
                  </div>
                </div>
              ))}
            </div>

            {!allDone && (
              <div className="af-note">
                You haven’t completed all services yet — but everything is saved.
                You can continue later.
              </div>
            )}
          </div>

          <div className="af-card af-card-page">
            <h2 className="af-h2">Export</h2>
            <p className="context-help">
              Download your responses as JSON (useful for sending to the backend later).
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => downloadJson(`${draft.assessmentId}.json`, draft)}
            >
              Download JSON
            </button>

            <div className="af-divider" />

            <h2 className="af-h2">Reset</h2>
            <p className="context-help">
              This deletes the saved draft from your browser.
            </p>
            <button type="button" className="btn-secondary" onClick={onDiscard}>
              Discard draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

