type IconProps = { className?: string };

export function IconShield({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconCompass({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2 6-6 2 2-6 6-2Z" />
    </svg>
  );
}

export function IconLeaf({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 21c-4-4-6-8-6-12a6 6 0 0 1 12 0c0 4-2 8-6 12Z" />
      <path d="M12 21V9" />
    </svg>
  );
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

export function IconSave({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M5 5h12l2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M17 5v4H7V5M12 14v4" />
    </svg>
  );
}

export function IconChart({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15V9M12 15V7M16 15v-5" />
    </svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H10l-4 4v-4Z" />
    </svg>
  );
}

export function IconBotanical({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M16 28V14M16 14c-4-6-10-8-10-14 4 2 7 6 10 10 3-4 6-8 10-10 0 6-6 8-10 14Z" />
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="m14 6-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="m10 6 6 6-6 6" />
    </svg>
  );
}

const valueIcons = {
  shield: IconShield,
  compass: IconCompass,
  leaf: IconLeaf,
  calendar: IconCalendar,
  save: IconSave,
  chart: IconChart,
  chat: IconChat,
} as const;

export type LandingIconName = keyof typeof valueIcons;

export function LandingIcon({ name, className }: { name: LandingIconName; className?: string }) {
  const Icon = valueIcons[name];
  return <Icon className={className} />;
}
