import { useMemo, useState } from "react";
import {
  getArtifactDownloadRequest,
  updateAssessment,
  uploadArtifact,
} from "../assessmentsApi";
import { roleDisplayName, serviceDisplayName } from "../roles";
import type {
  AssessmentDraft,
  CanonicalRole,
  EvaluationServiceSummary,
  PendingArtifact,
  UploadedArtifact,
} from "../types";
import {
  ARTIFACT_RETENTION_NOTICE,
  PENDING_ARTIFACT_REASON_LABELS,
} from "../../lib/artifactUtils";
import { toFriendlyError } from "../../lib/userMessages";

type Props = {
  draft: AssessmentDraft;
  roles: CanonicalRole[];
  services: EvaluationServiceSummary[];
  authToken: string;
  onDraftChange: (draft: AssessmentDraft) => void;
};

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PendingArtifactsPage({
  draft,
  roles,
  services,
  authToken,
  onDraftChange,
}: Props) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = draft.pendingArtifacts ?? [];
  const uploaded = draft.uploadedArtifacts ?? [];
  const unresolved = pending.filter((item) => item.status === "pending");
  const allClear = unresolved.length === 0;

  const serviceLabel = useMemo(() => {
    const labels = new Map(
      services.map((service) => [service.service_id, serviceDisplayName(service)])
    );
    return (serviceId: string) =>
      labels.get(serviceId) ?? serviceDisplayName({ service_id: serviceId });
  }, [services]);

  async function persistDraft(nextDraft: AssessmentDraft) {
    const saved = await updateAssessment(nextDraft.assessmentId, nextDraft, authToken);
    onDraftChange(saved);
    return saved;
  }

  async function handleUpload(
    file: File,
    artifact?: PendingArtifact
  ) {
    setUploadingId(artifact?.id ?? "general");
    setError(null);
    setMessage(null);
    try {
      const result = await uploadArtifact(draft.assessmentId, authToken, file, {
        serviceId: artifact?.serviceId,
        capabilityId: artifact?.capabilityId,
        pendingArtifactId: artifact?.id,
      });
      const nextDraft: AssessmentDraft = {
        ...draft,
        pendingArtifacts: result.pendingArtifacts,
        uploadedArtifacts: result.uploadedArtifacts,
        updatedAt: new Date().toISOString(),
      };
      await persistDraft(nextDraft);
      setMessage(`Uploaded ${file.name}. ${ARTIFACT_RETENTION_NOTICE}`);
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDownload(item: UploadedArtifact) {
    setError(null);
    try {
      const { blob, fileName } = await getArtifactDownloadRequest(
        draft.assessmentId,
        item.id,
        authToken
      );
      triggerDownload(blob, fileName);
    } catch (err) {
      setError(toFriendlyError(err));
    }
  }

  return (
    <div className="af-page">
      <div className="af-page-inner">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Assessment Complete</div>
            <h1 className="af-h1">Pending Artifacts</h1>
            <p className="context-help">
              {draft.profile.company} · {roleDisplayName(draft.profile.role, roles)}
            </p>
          </div>
          <a className="af-link" href="/dashboard">
            Back to dashboard
          </a>
        </div>

        {allClear ? (
          <div className="af-card af-card-page">
            <h2 className="af-h2">All evidence received</h2>
            <p className="context-help">
              There are no outstanding documents for this assessment. You can return
              to your dashboard or continue another assessment when you are ready.
            </p>
          </div>
        ) : (
          <div className="af-card af-card-page">
            <h2 className="af-h2">Documents still needed</h2>
            <p className="context-help">
              Upload the items below when you have them. If you need permission or do
              not have a file yet, the assessment already captured that request.
            </p>
            <ul className="af-artifact-list">
              {unresolved.map((artifact) => (
                <li key={artifact.id} className="af-artifact-row">
                  <div className="af-artifact-main">
                    <strong>{artifact.label}</strong>
                    <div className="af-artifact-meta">
                      <span className="af-pill">
                        {serviceLabel(artifact.serviceId)}
                      </span>
                      <span className="af-pill">
                        {PENDING_ARTIFACT_REASON_LABELS[artifact.reason]}
                      </span>
                    </div>
                    {artifact.notes && (
                      <p className="context-help">{artifact.notes}</p>
                    )}
                  </div>
                  <label className="btn-secondary af-artifact-upload">
                    {uploadingId === artifact.id ? "Uploading…" : "Upload file"}
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
                      disabled={uploadingId !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUpload(file, artifact);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {uploaded.length > 0 && (
          <div className="af-card af-card-page">
            <h2 className="af-h2">Uploaded files</h2>
            <ul className="af-artifact-list">
              {uploaded.map((item) => (
                <li key={item.id} className="af-artifact-row">
                  <div className="af-artifact-main">
                    <strong>{item.fileName}</strong>
                    <div className="af-artifact-meta context-help">
                      Uploaded {new Date(item.uploadedAt).toLocaleString()}
                      {item.expired && " · File removed after 7 days — please re-upload"}
                    </div>
                  </div>
                  {!item.expired && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        void handleDownload(item);
                      }}
                    >
                      Download
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="context-help">{ARTIFACT_RETENTION_NOTICE}</p>

        {message && (
          <p className="chat-save-status" role="status">
            {message}
          </p>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <strong>Upload issue.</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}
