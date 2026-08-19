/**
 * Shared on/off toggle. Used by both the popup and the options page so
 * there's exactly one implementation to keep correct.
 *
 * Sizing is intentionally explicit and self-contained:
 * - `overflow-hidden` on the track means the thumb can never visually
 *   poke outside the pill, even under unusual zoom/font-size scaling.
 * - The thumb's translate distance is track width − thumb width − (2 ×
 *   inset) = 44 − 20 − 4 = 20px, computed once below instead of as a
 *   Tailwind arbitrary-value class, so it can't silently drift out of
 *   sync if the track or thumb size ever changes here.
 * - `box-sizing: border-box` (from Tailwind Preflight) plus fixed
 *   pixel dimensions on both elements means no layout-dependent sizing
 *   that could push the thumb past the track's edge.
 */

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
      className={`relative inline-block flex-shrink-0 overflow-hidden rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-hammy-500 focus-visible:ring-offset-2 ${
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
