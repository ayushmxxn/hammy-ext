export default function SoundToggleButton({
  enabled,
  onToggle
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute break sound' : 'Unmute break sound'}
      title={enabled ? 'Sound on' : 'Sound off'}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-hammy-ink/40 transition-colors hover:bg-hammy-100 hover:text-hammy-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-hammy-500 focus-visible:ring-offset-2"
    >
      {enabled ? <SoundOnIcon /> : <SoundOffIcon />}
    </button>
  );
}
function SoundOnIcon() {
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
      <polygon points="4 8 8 8 13 4 13 20 8 16 4 16 4 8" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}
function SoundOffIcon() {
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
      <polygon points="4 8 8 8 13 4 13 20 8 16 4 16 4 8" />
      <line x1="17" y1="8" x2="23" y2="14" />
      <line x1="23" y1="8" x2="17" y2="14" />
    </svg>
  );
}