type Props = {
  /** Fill color for the wave shape (matches the section below). */
  fill: string;
  className?: string;
};

/** Organic concave wave between teal and cream sections. */
export function LandingWave({ fill, className }: Props) {
  return (
    <div className={className ? `landing-wave ${className}` : "landing-wave"} aria-hidden>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="landing-wave__svg">
        <path
          fill={fill}
          d="M0,64 C320,120 480,0 720,48 C960,96 1120,24 1440,56 L1440,120 L0,120 Z"
        />
      </svg>
    </div>
  );
}

/** Wave that transitions from cream up into teal (inverted curve). */
export function LandingWaveToTeal({ className }: { className?: string }) {
  return (
    <div className={className ? `landing-wave landing-wave--to-teal ${className}` : "landing-wave landing-wave--to-teal"} aria-hidden>
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="landing-wave__svg">
        <path
          fill="var(--landing-teal)"
          d="M0,40 C360,0 600,100 960,52 C1200,20 1320,36 1440,28 L1440,100 L0,100 Z"
        />
      </svg>
    </div>
  );
}
