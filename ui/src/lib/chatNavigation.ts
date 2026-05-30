export type ChatLocationState = {
  startChat?: boolean;
};

export function buildChatPath(serviceIds: string[]): string {
  if (serviceIds.length === 0) return "/chat";
  return `/chat?services=${encodeURIComponent(serviceIds.join(","))}`;
}

export function chatLocationState(startChat: boolean): ChatLocationState {
  return startChat ? { startChat: true } : {};
}
