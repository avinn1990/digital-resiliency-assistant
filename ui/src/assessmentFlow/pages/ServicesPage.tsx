import { useEffect, useMemo, useState } from "react";
import type { EvaluationServiceSummary, UserProfile } from "../types";
import { servicesForRole } from "../roles";

type Props = {
  profile: UserProfile;
  services: EvaluationServiceSummary[];
  servicesLoading: boolean;
  servicesError: string | null;
  initialSelectedServiceIds?: string[];
  onConfirm: (selectedServiceIds: string[]) => void;
  allowBackToDashboard?: boolean;
};

export function ServicesPage({
  profile,
  services,
  servicesLoading,
  servicesError,
  initialSelectedServiceIds,
  onConfirm,
  allowBackToDashboard,
}: Props) {
  const visibleServices = useMemo(() => {
    const matched = servicesForRole(profile.role, services);
    return matched.length > 0 ? matched : services;
  }, [profile.role, services]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialSelectedServiceIds?.length) {
      setSelected(
        Object.fromEntries(initialSelectedServiceIds.map((id) => [id, true]))
      );
      return;
    }
    setSelected(Object.fromEntries(visibleServices.map((s) => [s.service_id, true])));
  }, [initialSelectedServiceIds, visibleServices]);

  const selectedIds = useMemo(() => {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [selected]);

  const canContinue = selectedIds.length > 0 && !servicesLoading;

  return (
    <div className="af-page">
      <div className="af-page-inner">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Step 2</div>
            <h1 className="af-h1">Select services for your role</h1>
            <p className="context-help">
              Based on <strong>{profile.role}</strong>, these are the services mapped
              to your role. You can deselect anything you don’t own.
            </p>
          </div>
          <a className="af-link" href={allowBackToDashboard ? "/dashboard" : "/profile"}>
            Back
          </a>
        </div>

        {servicesError && (
          <div className="error-banner" role="alert">
            <strong>Service catalog error.</strong> {servicesError}
          </div>
        )}

        <div className="af-card af-card-page">
          {servicesLoading ? (
            <div className="context-help">Loading services…</div>
          ) : visibleServices.length === 0 ? (
            <div className="context-help">
              No evaluation services are available yet.
            </div>
          ) : (
            <div className="af-service-list">
              {visibleServices.map((s) => (
                <label key={s.service_id} className="af-service relevant">
                  <input
                    type="checkbox"
                    checked={!!selected[s.service_id]}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [s.service_id]: e.target.checked,
                      }))
                    }
                  />
                  <div className="af-service-main">
                    <div className="af-service-title">
                      {s.service_name ?? s.service_id}
                      {s.version ? (
                        <span className="af-pill">v{s.version}</span>
                      ) : null}
                    </div>
                    {s.description && (
                      <div className="af-service-desc">{s.description}</div>
                    )}
                    <div className="af-service-meta">
                      <span className="af-mono">{s.service_id}</span>
                      <span className="af-pill ok">Mapped to your role</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="af-actions-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setSelected(
                  Object.fromEntries(visibleServices.map((s) => [s.service_id, true]))
                )
              }
              disabled={servicesLoading || visibleServices.length === 0}
            >
              Select all
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSelected({})}
              disabled={servicesLoading || visibleServices.length === 0}
            >
              Clear
            </button>
            <div className="af-spacer" />
            <button
              type="button"
              className="btn-primary"
              onClick={() => onConfirm(selectedIds)}
              disabled={!canContinue}
            >
              Confirm & start questions
            </button>
          </div>
          <p className="context-help">
            Selected: <strong>{selectedIds.length}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
