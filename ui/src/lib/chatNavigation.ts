export type ChatLocationState = {
  startChat?: boolean;
};

export type ParsedChatSearchParams = {
  /** Full assessment queue from the URL. */
  serviceIds: string[];
  /** Service currently being interviewed (single framework_id for the LLM). */
  activeServiceId: string;
};

/** Split comma-separated service ids; never treat the whole string as one framework_id. */
export function parseServiceIdsParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => decodeURIComponent(part).trim())
    .filter(Boolean);
}

export function parseChatSearchParams(search: string): ParsedChatSearchParams {
  const params = new URLSearchParams(search);
  const serviceIds = parseServiceIdsParam(params.get("services"));
  const explicitActive = params.get("service")?.trim() ?? "";
  const activeServiceId =
    explicitActive && serviceIds.includes(explicitActive)
      ? explicitActive
      : serviceIds[0] ?? explicitActive;
  return { serviceIds, activeServiceId };
}

export function buildChatPath(
  serviceIds: string[],
  draftId?: string,
  activeServiceId?: string
): string {
  const queue = serviceIds.map((id) => id.trim()).filter(Boolean);
  const params = new URLSearchParams();
  if (queue.length > 0) {
    params.set("services", queue.join(","));
    const active =
      activeServiceId?.trim() && queue.includes(activeServiceId.trim())
        ? activeServiceId.trim()
        : queue[0];
    params.set("service", active);
  }
  if (draftId?.trim()) {
    params.set("draft", draftId.trim());
  }
  const query = params.toString();
  return query ? `/chat?${query}` : "/chat";
}

export function chatLocationState(startChat: boolean): ChatLocationState {
  return startChat ? { startChat: true } : {};
}
