export type ChatLocationState = {
  startChat?: boolean;
};

export function buildChatPath(serviceIds: string[], draftId?: string): string {
  const params = new URLSearchParams();
  if (serviceIds.length > 0) {
    params.set("services", serviceIds.join(","));
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
