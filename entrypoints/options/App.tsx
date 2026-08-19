import { useEffect, useRef, useState } from 'react';
import type { BreakOrder, HammySettings, HammyStats } from '@/types';
import { getFullState, subscribeToState, updateSettings, resetStats } from '@/lib/storage';
import { sendToBackground } from '@/lib/messaging';
import { BREAK_TYPES } from '@/lib/breakTypes';
import HammyHeader from '@/components/HammyHeader';
import HammyVideo from '@/components/HammyVideo';
import Switch from '@/components/Switch';

export default function App() {
  const [settings, setSettings] = useState<HammySettings | null>(null);
  const [stats, setStats] = useState<HammyStats | null>(null);
  const [savedPulse, setSavedPulse] = useState(false);
  const saveTimeout = useRef<number | null>(null);

  useEffect(() => {
    getFullState().then((s) => {
      setSettings(s.settings);
      setStats(s.stats);
    });
    return subscribeToState((s) => {
      setSettings(s.settings);
      setStats(s.stats);
    });
  }, []);

  const persist = async (partial: Partial<HammySettings>) => {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    await updateSettings(partial);
    await sendToBackground({ type: 'SETTINGS_UPDATED' });
    flashSaved();
  };

  const flashSaved = () => {
    setSavedPulse(true);
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => setSavedPulse(false), 1400);
  };

  if (!settings || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hammy-cream">
        <div className="h-10 w-10 animate-breathe rounded-full bg-hammy-300" />
      </div>
    );
  }

  const toggleBreakType = (id: (typeof BREAK_TYPES)[number]['id']) => {
    const isEnabled = settings.enabledBreakTypes.includes(id);
    if (isEnabled && settings.enabledBreakTypes.length === 1) return; // keep at least one
    const next = isEnabled
      ? settings.enabledBreakTypes.filter((b) => b !== id)
      : [...settings.enabledBreakTypes, id];
    persist({ enabledBreakTypes: next });
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-hammy-cream px-6 py-8">
      <HammyHeader subtitle="Settings" />

      <div className="mt-2 flex items-center justify-between">
        <p className="text-2xl font-extrabold text-hammy-ink">
          Make Hammy yours
        </p>
        <span
          className={`text-xs font-semibold text-hammy-500 transition-opacity duration-300 ${
            savedPulse ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Saved ✓
        </span>
      </div>

      {/* Master enable */}
      <Section title="Reminders">
        <Row
          label="Enable break reminders"
          description="When off, Hammy stays quiet and no timers run."
        >
          <Switch
            checked={settings.enabled}
            onChange={(enabled) => {
              sendToBackground({ type: 'TOGGLE_ENABLED', enabled });
              setSettings({ ...settings, enabled });
              flashSaved();
            }}
            label="Enable break reminders"
          />
        </Row>

        <Row
          label="Remind me every"
          description="How often Hammy checks in on you."
        >
          <SliderInput
            value={settings.intervalMinutes}
            min={5}
            max={120}
            step={5}
            unit="min"
            onChange={(v) => persist({ intervalMinutes: v })}
          />
        </Row>

        <Row
          label="Snooze duration"
          description="How long a 'Snooze' postpones the next break."
        >
          <SliderInput
            value={settings.snoozeMinutes}
            min={1}
            max={30}
            step={1}
            unit="min"
            onChange={(v) => persist({ snoozeMinutes: v })}
          />
        </Row>

        <Row
          label="Break order"
          description="Cycle through break types in order, or mix it up."
        >
          <OrderToggle
            value={settings.breakOrder}
            onChange={(breakOrder) => persist({ breakOrder })}
          />
        </Row>

        <Row
          label="System notifications"
          description="Show a native Chrome notification when it's break time."
        >
          <Switch
            checked={settings.notificationStyle === 'system'}
            onChange={(on) =>
              persist({ notificationStyle: on ? 'system' : 'silent' })
            }
            label="Toggle system notifications"
          />
        </Row>

        <Row
          label="Notification sound"
          description="Play a sound alongside the notification."
        >
          <Switch
            checked={settings.soundEnabled}
            onChange={(soundEnabled) => persist({ soundEnabled })}
            label="Toggle notification sound"
          />
        </Row>

        <Row
          label="Freeze page during breaks"
          description="On: Hammy takes over the full page until the break ends. Off: Hammy shows as a small floating card and the page stays fully usable."
        >
          <Switch
            checked={settings.freezeOnBreak}
            onChange={(freezeOnBreak) => persist({ freezeOnBreak })}
            label="Toggle whether breaks freeze the page"
          />
        </Row>
      </Section>

      {/* Break types */}
      <Section title="Break types">
        <p className="-mt-2 mb-4 text-sm text-hammy-ink/60">
          Choose which breaks Hammy can suggest. Hover a card to preview.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BREAK_TYPES.map((bt) => {
            const enabled = settings.enabledBreakTypes.includes(bt.id);
            return (
              <BreakTypeCard
                key={bt.id}
                label={bt.label}
                tagline={bt.tagline}
                breakType={bt}
                enabled={enabled}
                onToggle={() => toggleBreakType(bt.id)}
              />
            );
          })}
        </div>
      </Section>

      {/* Stats */}
      <Section title="Your stats">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Today" value={stats.breaksCompletedToday} />
          <StatCard label="Streak" value={stats.streakDays} suffix="d" />
          <StatCard label="All time" value={stats.totalBreaksCompleted} />
        </div>
        <button
          onClick={async () => {
            await resetStats();
            const s = await getFullState();
            setStats(s.stats);
            flashSaved();
          }}
          className="mt-4 text-xs font-semibold text-hammy-ink/40 underline decoration-dotted underline-offset-4 transition-colors hover:text-hammy-600"
        >
          Reset stats
        </button>
      </Section>

      <footer className="mt-10 text-center text-xs font-medium text-hammy-ink/35">
        Hammy stores everything on this device only. No accounts, no
        analytics, no network requests — ever.
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-hammy-100">
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-hammy-500">
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-hammy-50">{children}</div>
    </section>
  );
}

function Row({
  label,
  description,
  children
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-hammy-ink">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-hammy-ink/50">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SliderInput({
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Value in ${unit}`}
        className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-hammy-200 accent-hammy-500"
      />
      <span className="w-14 text-right text-sm font-bold tabular-nums text-hammy-ink">
        {value} {unit}
      </span>
    </div>
  );
}

function OrderToggle({
  value,
  onChange
}: {
  value: BreakOrder;
  onChange: (v: BreakOrder) => void;
}) {
  const options: { id: BreakOrder; label: string }[] = [
    { id: 'random', label: 'Random' },
    { id: 'sequential', label: 'In order' }
  ];
  return (
    <div className="flex rounded-lg bg-hammy-50 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
            value === opt.id
              ? 'bg-white text-hammy-700 shadow-sm'
              : 'text-hammy-ink/40 hover:text-hammy-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function BreakTypeCard({
  breakType,
  label,
  tagline,
  enabled,
  onToggle
}: {
  breakType: (typeof BREAK_TYPES)[number];
  label: string;
  tagline: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      aria-pressed={enabled}
      className={`group flex flex-col overflow-hidden rounded-xl text-left ring-2 transition-all duration-200 active:scale-[0.97] ${
        enabled
          ? `${breakType.accent.ring} ring-offset-2`
          : 'ring-transparent opacity-60 grayscale hover:opacity-90'
      }`}
    >
      <div className="relative aspect-video w-full">
        <HammyVideo
          breakType={breakType}
          autoPlay={hovering}
          rounded="rounded-none"
          className="h-full w-full"
        />
        <div
          className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow ${
            enabled ? breakType.accent.solid : 'bg-black/30'
          }`}
        >
          {enabled ? '✓' : ''}
        </div>
      </div>
      <div className="bg-white px-2.5 py-2">
        <p className="text-xs font-bold text-hammy-ink">{label}</p>
        <p className="truncate text-[10px] text-hammy-ink/50">{tagline}</p>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  suffix = ''
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl bg-hammy-50 px-3 py-3 text-center">
      <p className="text-xl font-extrabold text-hammy-700">
        {value}
        {suffix}
      </p>
      <p className="text-[11px] font-medium text-hammy-ink/50">{label}</p>
    </div>
  );
}
