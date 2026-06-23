import { useEffect, useMemo, useState } from "react";
import type { CanonicalRole, EvaluationServiceSummary, UserProfile } from "../types";
import { roleDisplayName, serviceDisplayName, servicesForRole } from "../roles";
import { groupServicesByDomain } from "../serviceDomains";

type Props = {
  profile: UserProfile;
  roles: CanonicalRole[];
  services: EvaluationServiceSummary[];
  servicesLoading: boolean;
  servicesError: string | null;
  initialSelectedServiceIds?: string[];
  onConfirm: (selectedServiceIds: string[]) => void;
  allowBackToDashboard?: boolean;
  confirmLabel?: string;
};

export function ServicesPage({
  profile,
  roles,
  services,
  servicesLoading,
  servicesError,
  initialSelectedServiceIds,
  onConfirm,
  allowBackToDashboard,
  confirmLabel = "Confirm & Start Questions",
}: Props) {
  const profileRoleLabel = useMemo(
    () => roleDisplayName(profile.role, roles),
    [profile.role, roles]
  );

  const matchedServices = useMemo(
    () => servicesForRole(profile.role, services),
    [profile.role, services]
  );
  const noRoleMapping = matchedServices.length === 0;

  const visibleServices = useMemo(() => {
    return noRoleMapping ? services : matchedServices;
  }, [noRoleMapping, matchedServices, services]);

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

  const groupedServices = useMemo(
    () => groupServicesByDomain(visibleServices),
    [visibleServices]
  );

  const canContinue = selectedIds.length > 0 && !servicesLoading;

  return (
    <div className="af-page">
      <div className="af-page-inner">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Step 2</div>
            <h1 className="af-h1">Select Services for Your Role</h1>
            <p className="context-help">
              {noRoleMapping ? (
                <>
                  No services are attached to <strong>{profileRoleLabel}</strong>. Select
                  from the available services below.
                </>
              ) : (
                <>
                  Based on <strong>{profileRoleLabel}</strong>, these are the services mapped
                  to your role. You can deselect anything you don’t own.
                </>
              )}
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
              {groupedServices.map(({ domain, services: domainServices }) => (
                <section key={domain} className="af-service-domain-group">
                  <h2 className="af-service-domain-title">{domain}</h2>
                  {domainServices.map((s) => (
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
                          {serviceDisplayName(s)}
                          {s.version ? (
                            <span className="af-pill">v{s.version}</span>
                          ) : null}
                        </div>
                        {s.description && (
                          <div className="af-service-desc">{s.description}</div>
                        )}
                        <div className="af-service-meta">
                          {!noRoleMapping && (
                            <span className="af-pill ok">Mapped to Your Role</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </section>
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
              Select All
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
              {confirmLabel}
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
