export default function FreezeToggleButton({
  freeze,
  onToggle
}: {
  freeze: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={freeze}
      aria-label={
        freeze
          ? 'Freezes the page during breaks — click to let the page stay usable'
          : 'Page stays usable during breaks — click to freeze the page instead'
      }
      title={freeze ? 'Freezes page during breaks' : 'Page stays usable during breaks'}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-hammy-ink/40 transition-colors hover:bg-hammy-100 hover:text-hammy-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-hammy-500 focus-visible:ring-offset-2"
    >
      {freeze ? <FreezeIcon /> : <FloatIcon />}
    </button>
  );
}
function FreezeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  );
}
function FloatIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <rect x="12.5" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}