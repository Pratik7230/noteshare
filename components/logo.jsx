import Link from "next/link";

export function LogoIcon({ className = "size-7" }) {
  return (
    <svg
      viewBox="76 60 380 380"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Document Base */}
      <path
        d="M120 70 h180 l100 100 v240 a20 20 0 0 1 -20 20 h-260 a20 20 0 0 1 -20 -20 v-320 a20 20 0 0 1 20 -20 z"
        fill="#00D2FF"
      />
      {/* Document Fold */}
      <path d="M300 70 v80 a20 20 0 0 0 20 20 h80 z" fill="#007BFF" />

      {/* Note Lines */}
      <rect x="160" y="170" width="120" height="16" rx="8" fill="#ffffff" />
      <rect x="160" y="220" width="160" height="16" rx="8" fill="#ffffff" />
      <rect x="160" y="270" width="100" height="16" rx="8" fill="#ffffff" />

      {/* Share Network Connections */}
      <line
        x1="330"
        y1="280"
        x2="410"
        y2="220"
        className="stroke-[#1E1E2F] dark:stroke-white transition-colors"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <line
        x1="330"
        y1="280"
        x2="410"
        y2="340"
        className="stroke-[#1E1E2F] dark:stroke-white transition-colors"
        strokeWidth="16"
        strokeLinecap="round"
      />

      {/* Share Network Nodes */}
      <circle cx="330" cy="280" r="30" className="fill-[#1E1E2F] dark:fill-white transition-colors" />
      <circle cx="410" cy="220" r="22" className="fill-[#1E1E2F] dark:fill-white transition-colors" />
      <circle cx="410" cy="340" r="22" className="fill-[#1E1E2F] dark:fill-white transition-colors" />

      {/* Inner Dots for Nodes */}
      <circle cx="330" cy="280" r="12" fill="#00D2FF" />
      <circle cx="410" cy="220" r="8" className="fill-white dark:fill-[#007BFF] transition-colors" />
      <circle cx="410" cy="340" r="8" className="fill-white dark:fill-[#007BFF] transition-colors" />
    </svg>
  );
}

export function Logo({ href = "/", className = "", showText = true }) {
  return (
    <Link href={href} className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <LogoIcon className="size-7 shrink-0" />
      {showText && <span>NoteShare</span>}
    </Link>
  );
}
