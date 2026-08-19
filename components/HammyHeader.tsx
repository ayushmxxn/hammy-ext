interface HammyHeaderProps {
  onSettingsClick?: () => void;
  subtitle?: string;
}

export default function HammyHeader({
  onSettingsClick,
  subtitle
}: HammyHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <img
          src="/hammy-face.png"
          alt=""
          className="h-9 w-9 rounded-[10px] object-cover"
        />
        <div>
          <h1 className="text-base font-extrabold leading-none text-hammy-ink">
            Hammy
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[11px] font-medium text-hammy-ink/50">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          aria-label="Open Hammy settings"
          className="flex h-8 w-8 items-center justify-center rounded-full text-hammy-ink/50 transition-all duration-150 hover:bg-hammy-100 hover:text-hammy-700 active:scale-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5"
            width="18"
            height="18"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}
    </div>
  );
}
