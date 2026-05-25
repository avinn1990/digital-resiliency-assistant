import { FormEvent, useState } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Message the agent…",
}: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        aria-label="Message to agent"
      />
      <button
        type="submit"
        className="btn-primary"
        disabled={disabled || !input.trim()}
        aria-label="Send message"
      >
        Send
      </button>
    </form>
  );
}
