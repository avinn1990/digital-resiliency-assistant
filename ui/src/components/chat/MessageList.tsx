import { useRef } from "react";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import type { ChatMessage } from "../../services/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
};

export function MessageList({ messages, loading }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  useAutoScroll(listRef, messages.length + (loading ? 1 : 0));

  return (
    <div className="message-list" ref={listRef} role="log" aria-live="polite">
      {messages.length === 0 && (
        <p className="message-list-empty">No messages yet. Say hello to the agent.</p>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {loading && <TypingIndicator />}
    </div>
  );
}
