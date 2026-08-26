const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const THUMB_SIZE = 20;
const INSET = 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - INSET * 2;
export default function Switch({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
      className={`relative inline-block flex-shrink-0 overflow-hidden rounded-full transition-all duration-150 active:scale-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-hammy-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-hammy-500' : 'bg-black/[0.09]'
      }`}
    >
      <span
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          top: INSET,
          left: INSET,
          transform: checked ? `translateX(${THUMB_TRAVEL}px)` : 'translateX(0)'
        }}
        className="absolute rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      />
    </button>
  );
}