import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../../auth/types";
import { roleDisplayName, servicesForRole, serviceDescriptionForDisplay } from "../roles";
import type { CanonicalRole, EvaluationServiceSummary } from "../types";

type Props = {
  authUser: AuthUser;
  roles: CanonicalRole[];
  services: EvaluationServiceSummary[];
  servicesLoading: boolean;
  servicesError: string | null;
  onSignOut: () => void;
  onComplete: (profile: {
    company: string;
    role: string;
    selectedServiceIds: string[];
  }) => void;
};

export function OnboardingPage({
  authUser,
  roles,
  services,
  servicesLoading,
  servicesError,
  onSignOut,
  onComplete,
}: Props) {
  const [company, setCompany] = useState("");
  const [roleId, setRoleId] = useState("");
  const [selectedById, setSelectedById] = useState<Record<string, boolean>>({});

  const matchedServices = useMemo(
    () => servicesForRole(roleId, services),
    [roleId, services]
  );

  const selectedRoleLabel = useMemo(
    () => roleDisplayName(roleId, roles),
    [roleId, roles]
  );

  const noRoleMapping =
    Boolean(roleId.trim()) && !servicesLoading && matchedServices.length === 0;

  const visibleServices = useMemo(() => {
    if (!roleId.trim()) return [];
    return noRoleMapping ? services : matchedServices;
  }, [roleId, services, noRoleMapping, matchedServices]);

  useEffect(() => {
    if (!roleId || servicesLoading) return;
    setSelectedById((prev) => {
      const next = { ...prev };
      visibleServices.forEach((service) => {
        if (next[service.service_id] === undefined) {
          next[service.service_id] = true;
        }
      });
      if (!noRoleMapping) {
        const visible = new Set(visibleServices.map((service) => service.service_id));
        for (const key of Object.keys(next)) {
          if (!visible.has(key)) delete next[key];
        }
      }
      return next;
    });
  }, [visibleServices, roleId, servicesLoading, noRoleMapping]);

  const selectedServiceIds = useMemo(() => {
    return Object.entries(selectedById)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
  }, [selectedById]);

  const canContinue = useMemo(() => {
    return (
      company.trim().length >= 2 &&
      roleId.trim().length >= 2 &&
      !servicesLoading &&
      selectedServiceIds.length > 0
    );
  }, [company, roleId, servicesLoading, selectedServiceIds.length]);

  return (
    <div className="af-page">
      <div className="af-page-inner af-onboarding">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Welcome</div>
            <h1 className="af-h1">Set up your workspace</h1>
            <p className="context-help">
              Hi {authUser.name.split(" ")[0]}, tell us where you work and what you do.
              We’ll show the assessment services mapped to your role.
            </p>
          </div>
          <div className="af-dashboard-top-actions">
            <button type="button" className="btn-ghost" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>

        {servicesError && (
          <div className="error-banner" role="alert">
            <strong>Service catalog error.</strong> {servicesError}
          </div>
        )}

        <div className="af-grid-2">
          <div className="af-card af-card-page">
            <label className="field-label" htmlFor="onboarding-company">
              Company
            </label>
            <input
              id="onboarding-company"
              className="af-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Example Corp"
              autoComplete="organization"
            />

            <label className="field-label" htmlFor="onboarding-role">
              Role
            </label>
            <select
              id="onboarding-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="af-input"
              disabled={servicesLoading || roles.length === 0}
            >
              <option value="" disabled>
                {servicesLoading ? "Loading roles…" : "Select your role"}
              </option>
              {roles.map((item) => (
                <option key={item.role_id} value={item.role_id}>
                  {item.display_name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-primary btn-large"
              onClick={() =>
                onComplete({
                  company: company.trim(),
                  role: roleId.trim(),
                  selectedServiceIds,
                })
              }
              disabled={!canContinue}
            >
              Confirm & start chat
            </button>
          </div>

          <div className="af-card af-card-page">
            <h2 className="af-h2">Services for your role</h2>
            {!roleId ? (
              <p className="context-help">
                Select a role to see the assessment services associated with it.
              </p>
            ) : servicesLoading ? (
              <p className="context-help">Loading services…</p>
            ) : noRoleMapping ? (
              <>
                <p className="context-help">
                  No services are attached to <strong>{selectedRoleLabel}</strong>. Select from
                  the available services below.
                </p>
                {services.length === 0 ? (
                  <p className="context-help">
                    No evaluation services are available yet.
                  </p>
                ) : (
                  <div className="af-onboarding-service-list">
                    {services.map((service) => (
                      <div key={service.service_id} className="af-onboarding-service">
                        <div className="af-onboarding-service-title">
                          <label className="af-inline-check">
                            <input
                              type="checkbox"
                              checked={selectedById[service.service_id] ?? false}
                              onChange={(e) =>
                                setSelectedById((prev) => ({
                                  ...prev,
                                  [service.service_id]: e.target.checked,
                                }))
                              }
                            />
                            <span>{service.service_name ?? service.service_id}</span>
                          </label>
                        </div>
                        {serviceDescriptionForDisplay(service.description) && (
                          <div className="af-onboarding-service-desc">
                            {serviceDescriptionForDisplay(service.description)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="context-help">
                  These services are mapped to <strong>{selectedRoleLabel}</strong>. They are
                  selected by default — uncheck any that do not apply.
                </p>
                <div className="af-onboarding-service-list">
                  {matchedServices.map((service) => (
                    <div key={service.service_id} className="af-onboarding-service">
                      <div className="af-onboarding-service-title">
                        <label className="af-inline-check">
                          <input
                            type="checkbox"
                            checked={selectedById[service.service_id] ?? true}
                            onChange={(e) =>
                              setSelectedById((prev) => ({
                                ...prev,
                                [service.service_id]: e.target.checked,
                              }))
                            }
                          />
                          <span>{service.service_name ?? service.service_id}</span>
                        </label>
                      </div>
                      {serviceDescriptionForDisplay(service.description) && (
                        <div className="af-onboarding-service-desc">
                          {serviceDescriptionForDisplay(service.description)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
