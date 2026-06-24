import type { ChatMessage } from "../../services/types";

type Props = {
  message: ChatMessage;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className="message-avatar" aria-hidden>
        {isUser ? "You" : "AI"}
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span className="message-sender">
            {isUser ? "You" : "Resiliency Agent"}
          </span>
          <time className="message-time" dateTime={message.timestamp}>
            {formatTime(message.timestamp)}
          </time>
        </div>
        <div className="message-bubble">
          {message.content}
          {message.attachments && message.attachments.length > 0 && (
            <ul className="message-attachments">
              {message.attachments.map((attachment) => (
                <li key={attachment.fileId}>{attachment.fileName}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
