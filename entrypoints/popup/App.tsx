import CreditFooter from "@/components/CreditFooter";
import Switch from "@/components/Switch";
import Timer from "@/components/Timer";
import { getBreakType } from "@/lib/breakTypes";
import { sendToBackground } from "@/lib/messaging";
import { getFullState, subscribeToState, updateSettings } from "@/lib/storage";
import type { BreakTypeId, HammyState } from "@/types";
import { useEffect, useState } from "react";

const INTERVAL_PRESETS_MINUTES = [5, 15, 30, 60, 120];

function formatPresetLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;

  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${minutes}m`;
}

/* ------------------------------------------------------------------ */
/*  Icons — one shared stroke weight (1.7) and viewBox (24) so every   */
/*  glyph in the popup reads as part of the same icon set.             */
/* ------------------------------------------------------------------ */

/** Modern gear icon with clean, rounded teeth */
function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m15 18-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 9v6h4l5 4V5L9 9H5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="m18 9 3 6m0-6-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <path d="M18 9.5a4 4 0 0 1 0 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  );
}

function FreezeIcon({ frozen }: { frozen: boolean }) {
  return frozen ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 8v8m8-8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 13h6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15 10v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 10.5a6 6 0 1 1 12 0c0 3.2 1 4.7 1.7 5.5.4.4.1 1-.4 1H4.7c-.5 0-.8-.6-.4-1 .7-.8 1.7-2.3 1.7-5.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BellOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 10.5a6 6 0 0 1 9.7-4.7M18 10.5c0 3.2 1 4.7 1.7 5.5.4.4.1 1-.4 1H8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 10.5c0 2.6-.6 4-1.2 4.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 13 4.5 4.5L19 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SnoozeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21a8.5 8.5 0 1 0-6.75-3.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 4 2.2 2.2M2.5 8.5h3.8V4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Small glyph per break type — shape only, no color; keeps every
 *  break visually distinct without breaking the gray/black palette. */
function BreakTypeIcon({ id }: { id: BreakTypeId }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (id) {
    case "breathe":
      return (
        <svg {...common}>
          <path d="M4 14c2-4 5-4 7 0s5 4 7 0" />
          <path d="M4 9c2-3 5-3 7 0s5 3 7 0" opacity="0.5" />
        </svg>
      );
    case "posture":
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2.1" fill="currentColor" stroke="none" />
          <path d="M12 8v6M8.5 11h7M9 20l3-6 3 6" />
        </svg>
      );
    case "eye-break":
      return (
        <svg {...common}>
          <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case "drink-water":
      return (
        <svg {...common}>
          <path d="M12 3.5s6 6.6 6 11a6 6 0 1 1-12 0c0-4.4 6-11 6-11Z" />
        </svg>
      );
    case "stretch":
      return (
        <svg {...common}>
          <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
          <path d="M12 8v6.5M12 8 7 4M12 8l5-4M12 14.5 8 20M12 14.5l4 5.5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Popup() {
  const [state, setState] = useState<HammyState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    getFullState().then(setState);
    return subscribeToState(setState);
  }, []);

  if (!state) {
    return (
      <div className="popup-shell flex h-[240px] w-[300px] items-center justify-center">
        <div className="h-7 w-7 animate-breathe rounded-full bg-black/[0.08]" />
      </div>
    );
  }

  const { settings, pendingBreak, nextBreakAt } = state;

  const handleSetInterval = async (minutes: number) => {
    if (minutes === settings.intervalMinutes) return;

    await updateSettings({
      intervalMinutes: minutes,
    });

    await sendToBackground({
      type: "SETTINGS_UPDATED",
    });
  };

  const handleComplete = () => {
    return sendToBackground({
      type: "COMPLETE_BREAK",
    });
  };

  const handleSnooze = () => {
    return sendToBackground({
      type: "SNOOZE_BREAK",
    });
  };

  const handleToggleSound = async () => {
    await updateSettings({
      soundEnabled: !settings.soundEnabled,
    });

    await sendToBackground({
      type: "SETTINGS_UPDATED",
    });
  };

  const handleToggleFreeze = async () => {
    await updateSettings({
      freezeOnBreak: !settings.freezeOnBreak,
    });

    await sendToBackground({
      type: "SETTINGS_UPDATED",
    });
  };

  /*
   * SETTINGS VIEW
   */
  if (settingsOpen) {
    return (
      <div className="popup-shell w-[300px] overflow-hidden text-hammy-ink">
        <div className="flex h-[46px] items-center gap-2 border-b border-black/[0.06] px-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Back to Hammy"
            className="icon-button"
          >
            <ArrowLeftIcon />
          </button>

          <h1 className="text-[13px] font-semibold tracking-[-0.01em]">
            Settings
          </h1>
        </div>

        <section className="px-3 pb-3 pt-3">
          <div className="settings-group">
            <div className="settings-row">
              <span className="icon-chip">
                <VolumeIcon muted={!settings.soundEnabled} />
              </span>

              <span className="min-w-0 flex-1 text-left">
                <span className="settings-title">Break sound</span>
                <span className="settings-description">
                  Play a sound when a break starts
                </span>
              </span>

              <Switch
                checked={settings.soundEnabled}
                onChange={handleToggleSound}
                label="Toggle break sound"
              />
            </div>

            <div className="settings-divider" />

            <div className="settings-row">
              <span className="icon-chip">
                <FreezeIcon frozen={settings.freezeOnBreak} />
              </span>

              <span className="min-w-0 flex-1 text-left">
                <span className="settings-title">Freeze page</span>
                <span className="settings-description">
                  Pause the page during breaks
                </span>
              </span>

              <Switch
                checked={settings.freezeOnBreak}
                onChange={handleToggleFreeze}
                label="Toggle freeze page"
              />
            </div>
          </div>
        </section>

        <CreditFooter />
      </div>
    );
  }

  const activeBreakType = pendingBreak ? getBreakType(pendingBreak.breakTypeId) : null;

  /*
   * MAIN POPUP
   */
  return (
    <div className="popup-shell w-[300px] overflow-hidden text-hammy-ink">
      <div className="flex h-[46px] items-center justify-start border-b border-black/[0.06] px-3">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          title="Settings"
          className="icon-button"
        >
          <SettingsIcon />
        </button>
      </div>

      <div className="px-3 pb-3 pt-4">
        {pendingBreak && activeBreakType ? (
          <div role="status" className="hammy-card animate-pop-in p-3">
            <div className="flex items-center gap-2">
              <span className="icon-chip">
                <BreakTypeIcon id={activeBreakType.id} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-hammy-ink/40">
                  Break time
                </p>
                <p className="mt-0.5 truncate text-[13px] font-semibold leading-snug">
                  {activeBreakType.label}
                </p>
              </div>
            </div>

            <p className="mt-2.5 text-[11.5px] leading-snug text-hammy-ink/55">
              {activeBreakType.tagline}
            </p>

            <div className="mt-3 flex gap-1.5">
              <button
                type="button"
                onClick={handleSnooze}
                className="secondary-button flex-1"
              >
                <SnoozeIcon />
                Snooze {settings.snoozeMinutes}m
              </button>

              <button
                type="button"
                onClick={handleComplete}
                className="primary-button flex-1"
              >
                <CheckIcon />
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="hammy-card px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="icon-chip">
                  <BellIcon />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold tracking-[-0.01em]">
                    {settings.enabled ? "Reminders on" : "Reminders off"}
                  </p>

                  {settings.enabled && nextBreakAt ? (
                    <Timer
                      targetTimestamp={nextBreakAt}
                      className="mt-0.5 block text-[12px] tabular-nums text-hammy-ink/45"
                    />
                  ) : (
                    <p className="mt-0.5 text-[12px] text-hammy-ink/45">
                      {settings.enabled ? "Starting…" : "Paused"}
                    </p>
                  )}
                </div>

                <Switch
                  checked={settings.enabled}
                  onChange={(enabled) =>
                    sendToBackground({
                      type: "TOGGLE_ENABLED",
                      enabled,
                    })
                  }
                  label="Toggle break reminders"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <span className="text-[11px] font-medium text-hammy-ink/45">
                  Remind me every
                </span>

                <span className="text-[11px] tabular-nums text-hammy-ink/35">
                  {formatPresetLabel(settings.intervalMinutes)}
                </span>
              </div>

              <div className="relative grid grid-cols-5 rounded-[11px] bg-black/[0.045] p-0.5">
                {INTERVAL_PRESETS_MINUTES.map((minutes) => {
                  const active = settings.intervalMinutes === minutes;

                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => handleSetInterval(minutes)}
                      aria-pressed={active}
                      className={`relative z-10 h-[30px] rounded-[8px] text-[12px] font-medium outline-none transition-colors duration-150 focus:outline-none focus-visible:outline-none ${
                        active
                          ? "text-hammy-ink"
                          : "text-hammy-ink/45 hover:text-hammy-ink/70"
                      }`}
                    >
                      {active && (
                        <span aria-hidden="true" className="interval-active-pill" />
                      )}

                      <span className="relative z-10">
                        {formatPresetLabel(minutes)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
