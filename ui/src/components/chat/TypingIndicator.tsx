export function TypingIndicator() {
  return (
    <div className="message-row assistant typing" aria-live="polite" aria-label="Agent is typing">
      <div className="message-avatar" aria-hidden>
        AI
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span className="message-sender">Resiliency Agent</span>
        </div>
        <div className="message-bubble typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
