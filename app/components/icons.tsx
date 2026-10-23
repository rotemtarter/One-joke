// Simple line icons for the system screens (DESIGN 2.3). Decorative: each screen has a title.

export function CalendarCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="14" y="20" width="68" height="62" rx="10" fill="#fff" stroke="currentColor" strokeWidth="5" />
      <path d="M14 30a10 10 0 0 1 10-10h48a10 10 0 0 1 10 10v8H14z" fill="var(--color-primary)" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M32 12v16M64 12v16" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M34 59l10 10 19-20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path d="M42.8 15.5a6 6 0 0 1 10.4 0l34 59A6 6 0 0 1 82 83.5H14a6 6 0 0 1-5.2-9z" fill="#fff" stroke="var(--color-red)" strokeWidth="6" strokeLinejoin="round" />
      <path d="M48 38v20" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="48" cy="70" r="4.5" fill="currentColor" />
    </svg>
  );
}
