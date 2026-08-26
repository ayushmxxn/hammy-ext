import CreditFooter from "@/components/CreditFooter";
import Switch from "@/components/Switch";
import Timer from "@/components/Timer";
import { BREAK_TYPES } from "@/lib/breakTypes";
import { normalizeDomain } from "@/lib/exclusions";
import { sendToBackground } from "@/lib/messaging";
import {
  getCustomVideo,
  getFullState,
  setCustomVideo,
  STORAGE_KEYS,
  subscribeToState,
  updateSettings,
} from "@/lib/storage";
import type { BreakTypeId, HammyState } from "@/types";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";

const INTERVAL_PRESETS_MINUTES = [5, 15, 30, 60, 120];

function formatPresetLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;

  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${minutes}m`;
}


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
    <img
      src="/icon-sound.webp"
      alt=""
      aria-hidden="true"
      className="h-4 w-4 object-contain transition-opacity duration-150"
      style={{ opacity: muted ? 0.4 : 1 }}
    />
  );
}

function FreezeIcon({ frozen }: { frozen: boolean }) {
  return (
    <img
      src="/icon-freeze.webp"
      alt=""
      aria-hidden="true"
      className="h-4 w-4 object-contain transition-opacity duration-150"
      style={{ opacity: frozen ? 1 : 0.4 }}
    />
  );
}

function BellIcon() {
  return (
    <img
      src="/icon-bell.webp"
      alt=""
      aria-hidden="true"
      className="h-4 w-4 object-contain"
    />
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

function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
const BREAK_TYPE_ICON_SRC: Record<BreakTypeId, string> = {
  breathe: "/icon-breathe.webp",
  posture: "/icon-posture.webp",
  "eye-break": "/icon-eye-break.webp",
  "drink-water": "/icon-drink-water.webp",
  stretch: "/icon-stretch.webp"
};

function BreakTypeIcon({ id }: { id: BreakTypeId }) {
  const src = BREAK_TYPE_ICON_SRC[id];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={17}
      height={17}
      className="h-[17px] w-[17px] object-contain"
    />
  );
}
function SectionLabel({
  children,
  first = false,
}: {
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <p
      className={`mb-1.5 px-0.5 text-[10px] font-medium tracking-[0.03em] text-hammy-ink/38 ${
        first ? "mt-0" : "mt-4"
      }`}
    >
      {children}
    </p>
  );
}
function PresetMinutesPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (minutes: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium text-hammy-ink/45">{label}</span>
        <span className="text-[11px] tabular-nums text-hammy-ink/35">
          {formatPresetLabel(value)}
        </span>
      </div>
      <div
        className="relative grid rounded-[11px] bg-black/[0.045] p-0.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((minutes) => {
          const active = value === minutes;
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => onChange(minutes)}
              aria-pressed={active}
              className={`relative z-10 h-[30px] rounded-[8px] text-[12px] font-medium outline-none transition-all duration-150 active:scale-[0.97] focus:outline-none focus-visible:outline-none ${
                active ? "text-hammy-ink" : "text-hammy-ink/45 hover:text-hammy-ink/70"
              }`}
            >
              {active && <span aria-hidden="true" className="interval-active-pill" />}
              <span className="relative z-10">{formatPresetLabel(minutes)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Popup() {
  const [state, setState] = useState<HammyState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [siteInput, setSiteInput] = useState("");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [customVideoDataUrl, setCustomVideoDataUrl] = useState<string | null>(null);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    getFullState().then(setState);
    return subscribeToState(setState);
  }, []);

  useEffect(() => {
    getCustomVideo().then(setCustomVideoDataUrl);
    const onStorageChange = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (!(STORAGE_KEYS.customVideo in changes)) return;
      const next = changes[STORAGE_KEYS.customVideo]?.newValue;
      setCustomVideoDataUrl(typeof next === "string" ? next : null);
    };
    browser.storage.onChanged.addListener(onStorageChange);
    return () => {
      try {
        browser.storage.onChanged.removeListener(onStorageChange);
      } catch {
        // Extension context may have been invalidated.
      }
    };
  }, []);
  if (!state) {
    return (
      <div className="popup-shell flex h-[240px] w-[300px] items-center justify-center">
        <div className="h-7 w-7 animate-breathe rounded-full bg-black/[0.08]" />
      </div>
    );
  }
  const { settings, nextBreakAt } = state;
  const handleSetInterval = async (minutes: number) => {
    if (minutes === settings.intervalMinutes) return;
    await updateSettings({
      intervalMinutes: minutes,
    });
    await sendToBackground({
      type: "SETTINGS_UPDATED",
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
  const toggleBreakType = async (id: BreakTypeId) => {
    const isEnabled = settings.enabledBreakTypes.includes(id);
    if (isEnabled && settings.enabledBreakTypes.length === 1) return;
    const next = isEnabled
      ? settings.enabledBreakTypes.filter((b) => b !== id)
      : [...settings.enabledBreakTypes, id];
    await updateSettings({ enabledBreakTypes: next });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };
  const MAX_CUSTOM_VIDEO_BYTES = 3 * 1024 * 1024;
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;

    e.target.value = "";
    if (!file) return;
    setVideoUploadError(null);
    if (file.size > MAX_CUSTOM_VIDEO_BYTES) {
      setVideoUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 3 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await setCustomVideo(dataUrl);
      } catch {
        setVideoUploadError(
          "Couldn't save the video (your browser's storage limit may have been reached). Try a smaller file."
        );
        return;
      }
      setCustomVideoDataUrl(dataUrl);
      await updateSettings({ customVideoEnabled: true });
      await sendToBackground({ type: "SETTINGS_UPDATED" });
    };
    reader.onerror = () => {
      setVideoUploadError("Failed to read the file. Please try again.");
    };
    reader.readAsDataURL(file);
  };
  const handleSelectHammy = async () => {
    await updateSettings({ customVideoEnabled: false });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };
  const handleSelectCustom = async () => {
    if (!customVideoDataUrl) return;
    await updateSettings({ customVideoEnabled: true });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  const handleRemoveCustomVideo = async () => {
    await setCustomVideo(null);
    setCustomVideoDataUrl(null);
    await updateSettings({ customVideoEnabled: false });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };
  const addExcludedSite = async () => {
    const normalized = normalizeDomain(siteInput);
    if (!normalized) {
      setSiteError("Enter a valid website, like example.com");
      return;
    }
    if (settings.excludedSites.includes(normalized)) {
      setSiteError(`${normalized} is already excluded`);
      return;
    }
    await updateSettings({ excludedSites: [...settings.excludedSites, normalized] });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
    setSiteInput("");
    setSiteError(null);
  };
  const removeExcludedSite = async (site: string) => {
    await updateSettings({
      excludedSites: settings.excludedSites.filter((s) => s !== site),
    });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };
  if (settingsOpen) {
    return (
      <div className="popup-shell w-[300px] overflow-hidden text-hammy-ink">
      <div className="flex h-[46px] items-center gap-1.5 border-b border-black/[0.06] px-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Back to Hammy"
            className="icon-button"
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="font-sans text-[13px] font-medium tracking-[-0.005em] text-hammy-ink/60">
            Settings
          </h1>
        </div>
        <section className="max-h-[480px] overflow-y-auto scrollbar-thin px-3 pb-3 pt-3">
          <SectionLabel first>Notifications</SectionLabel>
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
          </div>

          <SectionLabel>Display</SectionLabel>
          <div className="settings-group">
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

          <SectionLabel>Break animation</SectionLabel>
          <div className="settings-group p-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={handleSelectHammy}
                aria-pressed={!settings.customVideoEnabled}
                className={`flex flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11.5px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                  !settings.customVideoEnabled
                    ? "border-black/[0.18] bg-black/[0.05] text-hammy-ink"
                    : "border-black/[0.08] bg-white text-hammy-ink/55 hover:text-hammy-ink/80"
                }`}
              >
                <span className="text-[15px]">🐹</span>
                Hammy
              </button>
              <button
                type="button"
                onClick={handleSelectCustom}
                disabled={!customVideoDataUrl}
                aria-pressed={settings.customVideoEnabled && !!customVideoDataUrl}
                className={`flex flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11.5px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                  settings.customVideoEnabled && customVideoDataUrl
                    ? "border-black/[0.18] bg-black/[0.05] text-hammy-ink"
                    : customVideoDataUrl
                    ? "border-black/[0.08] bg-white text-hammy-ink/55 hover:text-hammy-ink/80"
                    : "border-black/[0.06] bg-white/50 text-hammy-ink/30 cursor-not-allowed"
                }`}
              >
                <span className="text-[15px]">🎬</span>
                Custom
              </button>
            </div>
            {customVideoDataUrl ? (
              <div className="flex flex-col gap-2">
                <video
                  src={customVideoDataUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full rounded-lg bg-black/[0.05] object-cover"
                  style={{ maxHeight: 96 }}
                  aria-label="Custom break animation preview"
                  onError={() => {
                    setVideoUploadError("Video could not be decoded. Please upload a valid .webm file.");
                    handleRemoveCustomVideo();
                  }}
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-lg border border-black/[0.09] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-hammy-ink/70 transition-all duration-150 hover:bg-black/[0.03] active:scale-[0.97]"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCustomVideo}
                    className="flex-1 rounded-lg border border-black/[0.09] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-500/80 transition-all duration-150 hover:text-red-500 hover:bg-red-50 active:scale-[0.97]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-black/[0.15] bg-black/[0.02] px-3 py-2.5 text-center text-[11px] font-medium text-hammy-ink/45 transition-all duration-150 hover:border-hammy-400 hover:bg-hammy-50/50 hover:text-hammy-ink/70 active:scale-[0.97]"
              >
                Upload .webm (max 3 MB)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/webm"
              className="hidden"
              aria-label="Upload custom break animation"
              onChange={handleVideoUpload}
            />
            {videoUploadError && (
              <p className="mt-1.5 text-[10.5px] font-medium text-red-500">
                {videoUploadError}
              </p>
            )}
          </div>
          <SectionLabel>Excluded sites</SectionLabel>
          <div className="settings-group p-3">
            <p className="mb-2.5 text-[10.5px] leading-snug text-hammy-ink/45">
              Hammy will never interrupt these sites, or their subdomains.
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={siteInput}
                onChange={(e) => {
                  setSiteInput(e.target.value);
                  if (siteError) setSiteError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExcludedSite();
                  }
                }}
                placeholder="example.com"
                aria-label="Website to exclude"
                className="w-full min-w-0 rounded-lg border border-black/[0.09] bg-white px-2.5 py-1.5 text-[12px] text-hammy-ink placeholder:text-hammy-ink/30 focus:border-hammy-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={addExcludedSite}
                className="primary-button flex-shrink-0 px-3"
              >
                Add
              </button>
            </div>
            {siteError && (
              <p className="mt-1.5 text-[10.5px] font-medium text-red-500">
                {siteError}
              </p>
            )}
            {settings.excludedSites.length > 0 && (
              <ul className="mt-2.5 flex flex-col gap-[3px]">
                {settings.excludedSites.map((site) => (
                  <li
                    key={site}
                    className="group flex items-center justify-between gap-2 rounded-lg px-2 py-[7px] transition-colors duration-150 hover:bg-black/[0.035]"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span aria-hidden="true" className="h-[3px] w-[3px] flex-shrink-0 rounded-full bg-hammy-ink/25" />
                      <span className="truncate text-[11.5px] text-hammy-ink/80">
                        {site}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExcludedSite(site)}
                      aria-label={`Remove ${site} from excluded sites`}
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-hammy-ink/30 opacity-0 transition-all duration-150 hover:bg-red-500/10 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100 active:scale-90"
                    >
                      <CloseIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <SectionLabel>Break types</SectionLabel>
          <div className="settings-group p-3">
            <div className="grid grid-cols-2 gap-2">
              {BREAK_TYPES.map((bt) => {
                const enabled = settings.enabledBreakTypes.includes(bt.id);
                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => toggleBreakType(bt.id)}
                    aria-pressed={enabled}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition-all duration-150 active:scale-[0.97] ${
                      enabled
                        ? "border-black/[0.16] bg-black/[0.05]"
                        : "border-black/[0.07] bg-white hover:border-black/[0.12] hover:bg-black/[0.02]"
                    }`}
                  >
                    <span
                      className={`icon-chip h-6 w-6 flex-[0_0_24px] transition-opacity duration-150 ${
                        enabled ? "" : "opacity-50"
                      }`}
                    >
                      <BreakTypeIcon id={bt.id} />
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-[11px] font-semibold transition-colors duration-150 ${
                        enabled ? "text-hammy-ink" : "text-hammy-ink/45"
                      }`}
                    >
                      {bt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <CreditFooter />
      </div>
    );
  }
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
          <PresetMinutesPicker
            label="Remind me every"
            value={settings.intervalMinutes}
            options={INTERVAL_PRESETS_MINUTES}
            onChange={handleSetInterval}
          />
        </div>
      </div>
    </div>
  );
}