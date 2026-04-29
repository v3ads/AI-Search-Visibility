export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <path d="M14 57A29 29 0 0 1 14 15" stroke="url(#logo-grad)" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M18 50A21 21 0 0 1 18 22" stroke="url(#logo-grad)" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.72" />
      <path d="M22 43A11 11 0 0 1 22 29" stroke="url(#logo-grad)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="36" r="5.5" fill="url(#logo-grad)" />
      <circle cx="54" cy="36" r="3" fill="url(#logo-grad)" opacity="0.75" />
    </svg>
  );
}

export function LogoLockup({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span style={{
        fontWeight: 800,
        fontSize: size * 0.75,
        letterSpacing: "-0.02em",
        background: "linear-gradient(135deg, #A855F7, #06B6D4)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        lineHeight: 1,
      }}>
        PlumBoost
      </span>
    </div>
  );
}
