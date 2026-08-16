interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export function Logo({ className = 'h-10 w-10', showText = true, variant = 'light' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';
  const subColor = variant === 'light' ? 'text-gold-400' : 'text-gold-600';

  return (
    <div className="flex items-center gap-2.5">
      <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer badge */}
        <rect x="2" y="2" width="60" height="60" rx="14" fill="#1a1a2e" stroke="#eab308" strokeWidth="2" />
        {/* Kente-inspired top stripe */}
        <rect x="2" y="2" width="60" height="6" rx="3" fill="#eab308" />
        <rect x="2" y="5" width="60" height="3" fill="#f97316" opacity="0.6" />
        {/* Ballot box */}
        <rect x="16" y="20" width="32" height="28" rx="3" fill="white" opacity="0.95" />
        {/* Slot */}
        <rect x="26" y="18" width="12" height="4" rx="1" fill="#eab308" />
        {/* Checkmark / vote symbol */}
        <path
          d="M24 34 L29 39 L40 28"
          stroke="#16a34a"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bottom accent */}
        <rect x="16" y="52" width="32" height="2" rx="1" fill="#eab308" opacity="0.5" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-display text-lg font-extrabold tracking-tight ${textColor}`}>
            da akɔ
          </span>
          <span className={`text-[10px] font-medium uppercase tracking-widest ${subColor}`}>
            Vote. Count. Trust.
          </span>
        </div>
      )}
    </div>
  );
}
