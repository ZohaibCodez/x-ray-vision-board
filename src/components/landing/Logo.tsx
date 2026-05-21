export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="xrv-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00C8E0" />
          <stop offset="1" stopColor="#0080FF" />
        </linearGradient>
      </defs>
      <path d="M5 5L27 27M27 5L5 27" stroke="url(#xrv-g)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill="#0A0E17" stroke="#00C8E0" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="1.2" fill="#00C8E0" />
    </svg>
  );
}
