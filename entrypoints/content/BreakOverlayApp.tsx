import { useEffect, useRef, useState } from 'react';
import type { ContentScriptContext } from 'wxt/client';
import type { HammyState } from '@/types';
import { getFullState, subscribeToState } from '@/lib/storage';
import { sendToBackground } from '@/lib/messaging';
import { getBreakType, getVideoUrl } from '@/lib/breakTypes';

/**
 * Mounted once per page via a shadow-root content script. Renders
 * nothing unless a break is currently pending.
 *
 * Two display modes, controlled by `settings.freezeOnBreak`:
 *  - freeze (default): the classic full-viewport takeover, page
 *    scroll locked, nothing underneath is clickable until the break
 *    ends.
 *  - no freeze: a small floating card in the corner. The page stays
 *    completely usable — scroll, clicks, forms all keep working —
 *    while Hammy plays alongside it.
 *
 * In both modes the video is drawn onto a transparent <canvas> instead
 * of shown via a plain <video> tag: a native <video> element always
 * paints an opaque rectangle, even when its source has an alpha
 * channel — that's a browser rendering rule, not something any CSS or
 * container setting can override. Compositing each frame onto a
 * `{ alpha: true }` 2D canvas is the only way Chrome preserves
 * per-pixel transparency, so the page underneath stays visible through
 * the transparent parts of the clip. This requires the .webm itself to
 * actually be encoded with a VP9 alpha channel — see
 * public/videos/README.txt for the ffmpeg command if you need to
 * re-export one. Re-compressing these files with a generic transcode
 * (change resolution/bitrate, re-encode video+audio) is easy to get
 * wrong: general-purpose libvpx-vp9 alpha re-encoding is flaky, so a
 * "smaller" re-export can silently end up fully opaque even though
 * every tool still reports alpha_mode: 1 in the metadata. If these
 * clips ever need to be re-compressed for size, verify the result by
 * eye (or with `ffmpeg -vf format=yuva420p,alphaextract`) before
 * shipping it — don't trust the metadata flag alone.
 */
// Hard ceiling on how long a break overlay is ever allowed to stay up,
// independent of the video finishing, erroring, or any message reaching
// the background worker. Longest suggestedSeconds (30s) + the existing
// per-video safety net (20s) is 50s — 90s leaves headroom while
// guaranteeing the page is never blocked indefinitely by a break that
// somehow never got cleared from storage (e.g. left over from an older,
// buggy build, or a service worker that was asleep when COMPLETE_BREAK
// was sent).
const MAX_BREAK_AGE_MS = 90_000;

export default function BreakOverlayApp({ ctx }: { ctx: ContentScriptContext }) {
  const [state, setState] = useState<HammyState | null>(null);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

  useEffect(() => {
    // The context can already be invalid by the time this effect runs (the
    // extension can be reloaded/updated between the shadow root mounting
    // and this effect firing) — skip touching chrome.storage entirely
    // rather than kicking off work that's guaranteed to fail.
    if (ctx.isInvalid) return;

    getFullState().then((s) => {
      if (!ctx.isInvalid) setState(s);
    });

    const unsubscribe = subscribeToState((s) => {
      if (!ctx.isInvalid) setState(s);
    });
    // Belt-and-suspenders: subscribeToState's own onChanged listener already
    // no-ops once the context is invalid (see lib/storage.ts), but tying the
    // unsubscribe directly to ctx.onInvalidated guarantees the listener is
    // torn down the instant WXT detects invalidation — not whenever (or if)
    // this component's effect cleanup happens to run afterward.
    const stopOnInvalidated = ctx.onInvalidated(unsubscribe);

    return () => {
      unsubscribe();
      stopOnInvalidated();
    };
  }, [ctx]);

  // Get the current tab ID
  useEffect(() => {
    if (ctx.isInvalid) return;

    const getCurrentTabId = async () => {
      try {
        // Get tab ID from background script (more reliable than direct query)
        const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_ID' });
        if (!ctx.isInvalid) setCurrentTabId(response?.tabId ?? null);
      } catch {
        // Covers both a genuinely missing receiver (background asleep) and
        // "Extension context invalidated" thrown synchronously by
        // chrome.runtime.sendMessage once the context is torn down — either
        // way there's no tab ID to report, and nothing left to update state
        // for once the context is gone.
        if (!ctx.isInvalid) setCurrentTabId(null);
      }
    };

    getCurrentTabId();
  }, [ctx]);

  const pendingBreak = state?.pendingBreak;
  const breakType = pendingBreak ? getBreakType(pendingBreak.breakTypeId) : undefined;

  const isStaleOrInvalid =
    !!pendingBreak &&
    (!breakType || Date.now() - pendingBreak.triggeredAt > MAX_BREAK_AGE_MS);

  // Never trust a pendingBreak blindly: if it references a break type we
  // don't recognize, or it's simply too old to still be legitimate,
  // clear it from storage (so every tab and the popup agree it's over)
  // instead of rendering an overlay for something that's already stuck.
  useEffect(() => {
    if (isStaleOrInvalid && !ctx.isInvalid) {
      sendToBackground({ type: 'COMPLETE_BREAK' });
    }
  }, [isStaleOrInvalid, pendingBreak?.triggeredAt, ctx]);

  // If this page is in native browser fullscreen (YouTube's fullscreen
  // player, a fullscreen video/game, etc.), the Fullscreen API hides
  // *everything* outside the fullscreened element — including this
  // overlay, no matter how high its z-index is set. That's a browser
  // compositing rule, not something CSS can override. So the instant a
  // break becomes pending, force the page out of fullscreen — this is
  // allowed without a user gesture — so the overlay actually becomes
  // visible instead of silently rendering behind a fullscreen video no
  // one can see it through.
  useEffect(() => {
    if (!pendingBreak) return;

    const exitIfFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => void 0);
      }
    };

    exitIfFullscreen();
    // Some pages (YouTube included) can re-enter fullscreen on their
    // own mid-playback — keep knocking it back out for as long as this
    // break is up, not just at the moment it started.
    document.addEventListener('fullscreenchange', exitIfFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', exitIfFullscreen);
  }, [pendingBreak?.triggeredAt]);

  if (!pendingBreak || !breakType || isStaleOrInvalid) return null;

  // Only show the break overlay if this tab matches the target tab ID
  if (pendingBreak.targetTabId && currentTabId !== pendingBreak.targetTabId) {
    return null;
  }

  return (
    <BreakVideo
      key={pendingBreak.triggeredAt}
      ctx={ctx}
      breakType={breakType}
      soundEnabled={state?.settings.soundEnabled ?? true}
      freezeOnBreak={state?.settings.freezeOnBreak ?? true}
    />
  );
}

function BreakVideo({
  ctx,
  breakType,
  soundEnabled,
  freezeOnBreak
}: {
  ctx: ContentScriptContext;
  breakType: ReturnType<typeof getBreakType>;
  soundEnabled: boolean;
  freezeOnBreak: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  // Tracks whether the clip is actually playable. Until this flips to
  // `true`, or we give up and fall back below, the canvas can end up
  // fully transparent (nothing drawn yet). Without this guard, freeze
  // mode leaves a page-covering, click-swallowing overlay that's
  // completely invisible — indistinguishable from the tab just being
  // frozen. See `videoFailed` for the escape hatch.
  const [videoFailed, setVideoFailed] = useState(false);

  const complete = () => {
    if (ctx.isInvalid) return;
    sendToBackground({ type: 'COMPLETE_BREAK' });
  };

  // If the clip can't load or start playing within a few seconds (wrong
  // filename, missing file, unsupported codec, etc.), stop waiting on it
  // and show a visible fallback instead of an invisible blocker. Uses
  // ctx.setTimeout so this is automatically cancelled if the context is
  // invalidated before it fires, instead of running against a torn-down
  // extension context.
  useEffect(() => {
    if (videoFailed || ctx.isInvalid) return;
    const timeout = ctx.setTimeout(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) setVideoFailed(true);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [breakType.id, videoFailed, ctx]);

  // Lock page scroll only in freeze mode. In the floating-card mode the
  // page must stay fully interactive, so this is skipped entirely. Only
  // ever restores the value if it's still exactly what we set — if the
  // host page's own script changed `overflow` while the break was
  // showing (some SPAs, YouTube included, toggle this for their own
  // dialogs/theater mode in the background), we leave that alone
  // instead of stomping on it on cleanup.
  useEffect(() => {
    if (!freezeOnBreak) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      if (root.style.overflow === 'hidden') {
        root.style.overflow = prevOverflow;
      }
    };
  }, [freezeOnBreak]);

  // Draw each decoded video frame onto the alpha-enabled canvas, cropped
  // "cover"-style so it always fills its box (full viewport in freeze
  // mode, the small card in floating mode) with no bars. The canvas is
  // sized to whatever element wraps it — a fixed-size card, or the
  // viewport — rather than assuming full-screen.
  useEffect(() => {
    if (videoFailed) return; // canvas isn't rendered in the fallback state
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!video || !canvas || !wrap) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    function resizeCanvas() {
      const rect = wrap!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
    }
    resizeCanvas();
    // In freeze mode the box is the viewport, which can change size
    // (window resize). In floating mode the card's own size never
    // changes on its own, but this stays cheap either way.
    window.addEventListener('resize', resizeCanvas);

    function drawFrame() {
      if (video!.readyState >= 2 && video!.videoWidth > 0) {
        const vW = video!.videoWidth;
        const vH = video!.videoHeight;
        const cW = canvas!.width;
        const cH = canvas!.height;
        const videoRatio = vW / vH;
        const canvasRatio = cW / cH;

        let sx = 0;
        let sy = 0;
        let sw = vW;
        let sh = vH;

        if (videoRatio > canvasRatio) {
          sw = vH * canvasRatio;
          sx = (vW - sw) / 2;
        } else {
          sh = vW / canvasRatio;
          sy = (vH - sh) / 2;
        }

        ctx!.clearRect(0, 0, cW, cH);
        ctx!.drawImage(video!, sx, sy, sw, sh, 0, 0, cW, cH);
      }
      rafRef.current = requestAnimationFrame(drawFrame);
    }
    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [breakType.id, videoFailed, freezeOnBreak]);

  // Attempt unmuted autoplay on the (visually hidden) source video —
  // but only if the person hasn't turned sound off in the popup.
  // With sound off, play muted straight away and skip the "tap for
  // sound" prompt entirely — an explicit preference, not a browser
  // autoplay restriction, so there's nothing to recover from.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!soundEnabled) {
      video.muted = true;
      video.play().catch(() => void 0);
      return;
    }

    video.muted = false;
    video.volume = 1;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Browsers block unmuted autoplay without a prior user gesture
        // on that page — fall back to muted and ask for one tap.
        video.muted = true;
        video.play().catch(() => void 0);
        setNeedsSoundTap(true);
      });
    }
  }, [breakType.id, soundEnabled]);

  // Safety net: if the video never fires 'ended' (fails to load, wrong
  // format, etc.), don't leave the person locked out.
  useEffect(() => {
    const timeout = ctx.setTimeout(
      () => complete(),
      (breakType.suggestedSeconds + 20) * 1000
    );
    return () => window.clearTimeout(timeout);
  }, [breakType.id, ctx]);

  // Esc is the one keyboard escape hatch, in case a clip can't play at all.
  // Only wired up in freeze mode — in floating mode nothing is being
  // blocked, so there's nothing to escape from.
  useEffect(() => {
    if (!freezeOnBreak) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') complete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [freezeOnBreak]);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => void 0);
    setNeedsSoundTap(false);
  };

  // Decode source only — never shown directly, since a native <video>
  // tag can't render transparency. The canvas is what's actually
  // visible.
  const hiddenSourceVideo = (
    <video
      ref={videoRef}
      src={getVideoUrl(breakType)}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none'
      }}
      autoPlay
      loop={false}
      playsInline
      disablePictureInPicture
      onEnded={complete}
      onError={() => setVideoFailed(true)}
      aria-hidden="true"
      tabIndex={-1}
    />
  );

  const fallback = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-hammy-ink/95 px-6 text-center text-white">
      <p className="text-sm font-semibold">
        Hammy: time for a {breakType.label.toLowerCase()} break 🐹
      </p>
      <p className="max-w-[220px] text-xs text-white/80">{breakType.tagline}</p>
      <button
        onClick={complete}
        className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-hammy-ink shadow-lg transition-transform active:scale-95"
      >
        Done
      </button>
    </div>
  );

  const soundTap = needsSoundTap && !videoFailed && (
    <button
      onClick={handleUnmute}
      className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-hammy-ink shadow-lg backdrop-blur transition-transform active:scale-95"
    >
      🔊 Tap for sound
    </button>
  );

  if (freezeOnBreak) {
    return (
      <div
        className="hammy-overlay-root fixed inset-0 z-[2147483647]"
        role="dialog"
        aria-modal="true"
        aria-label={`Hammy break: ${breakType.label}`}
        onClick={needsSoundTap ? handleUnmute : undefined}
      >
        {hiddenSourceVideo}
        {videoFailed ? (
          fallback
        ) : (
          <div ref={canvasWrapRef} className="h-full w-full">
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              style={{ display: 'block' }}
            />
          </div>
        )}
        {soundTap}
      </div>
    );
  }

  // Non-freeze mode: a small floating card, pinned to the corner. The
  // wrapper spans no more than the card itself and never intercepts
  // clicks meant for the page, so everything underneath keeps working.
  // The transparent canvas still lets the card's own background (and,
  // through it, the page) show through around Hammy.
  return (
    <div
      className="hammy-overlay-root fixed bottom-5 right-5 z-[2147483647] w-[240px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/10"
      role="status"
      aria-label={`Hammy break: ${breakType.label}`}
    >
      <div className="relative aspect-[4/3] w-full bg-hammy-paper">
        {hiddenSourceVideo}
        {videoFailed ? (
          fallback
        ) : (
          <div ref={canvasWrapRef} className="h-full w-full">
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              style={{ display: 'block' }}
            />
          </div>
        )}
        {soundTap}
      </div>
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-hammy-ink">
            {breakType.label}
          </p>
          <p className="truncate text-[10px] text-hammy-ink/50">
            {breakType.tagline}
          </p>
        </div>
        <button
          onClick={complete}
          className="flex-shrink-0 rounded-full bg-hammy-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-hammy-600"
        >
          Done
        </button>
      </div>
    </div>
  );
}
