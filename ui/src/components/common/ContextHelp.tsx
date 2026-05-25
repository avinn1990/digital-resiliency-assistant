import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  id?: string;
};

/** Short, supportive guidance — not instructions users must memorize. */
export function ContextHelp({ children, id }: Props) {
  return (
    <p className="context-help" id={id}>
      {children}
    </p>
  );
}
