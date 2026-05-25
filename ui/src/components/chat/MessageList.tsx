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
    <div
      className="message-list"
      ref={listRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversation with assessment agent"
    >
      {messages.length === 0 && !loading && (
        <div className="message-list-empty">
          <p>
            <strong>The agent will ask the first question shortly.</strong>
          </p>
          <p>Reply in everyday language — you don't need special formatting.</p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {loading && <TypingIndicator />}
    </div>
  );
}
