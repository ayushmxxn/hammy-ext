import { getBreakType, getVideoUrl } from "@/lib/breakTypes";
import { isUrlExcluded } from "@/lib/exclusions";
import { sendToBackground } from "@/lib/messaging";
import {
  getCustomVideo,
  getFullState,
  STORAGE_KEYS,
  subscribeToState,
} from "@/lib/storage";
import type { HammyMessage, HammyState } from "@/types";
import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import type { ContentScriptContext } from "wxt/client";

const MAX_BREAK_AGE_MS = 90_000;
export default function BreakOverlayApp({
  ctx,
}: {
  ctx: ContentScriptContext;
}) {
  const [state, setState] = useState<HammyState | null>(null);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [customVideoDataUrl, setCustomVideoDataUrl] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (ctx.isInvalid) return;
    getFullState().then((s) => {
      if (!ctx.isInvalid) setState(s);
    });
    const unsubscribe = subscribeToState((s) => {
      if (!ctx.isInvalid) setState(s);
    });
    const stopOnInvalidated = ctx.onInvalidated(unsubscribe);
    return () => {
      unsubscribe();
      stopOnInvalidated();
    };
  }, [ctx]);

  useEffect(() => {
    if (ctx.isInvalid) return;
    getCustomVideo().then((url) => {
      if (!ctx.isInvalid) setCustomVideoDataUrl(url);
    });
    const onStorageChange = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== "local") return;
      if (!(STORAGE_KEYS.customVideo in changes)) return;
      const next = changes[STORAGE_KEYS.customVideo]?.newValue;
      if (!ctx.isInvalid) {
        setCustomVideoDataUrl(typeof next === "string" ? next : null);
      }
    };
    browser.storage.onChanged.addListener(onStorageChange);
    const stopOnInvalidated = ctx.onInvalidated(() =>
      browser.storage.onChanged.removeListener(onStorageChange),
    );
    return () => {
      browser.storage.onChanged.removeListener(onStorageChange);
      stopOnInvalidated();
    };
  }, [ctx]);
  useEffect(() => {
    if (ctx.isInvalid) return;
    const getCurrentTabId = async () => {
      try {

        const response = await browser.runtime.sendMessage<
          HammyMessage,
          { tabId: number | undefined }
        >({ type: "GET_CURRENT_TAB_ID" });
        if (!ctx.isInvalid) setCurrentTabId(response?.tabId ?? null);
      } catch {
        if (!ctx.isInvalid) setCurrentTabId(null);
      }
    };
    getCurrentTabId();
  }, [ctx]);
  const pendingBreak = state?.pendingBreak;
  const breakType = pendingBreak
    ? getBreakType(pendingBreak.breakTypeId)
    : undefined;

  const isStaleOrInvalid =
    !!pendingBreak &&
    (!breakType || Date.now() - pendingBreak.triggeredAt > MAX_BREAK_AGE_MS);

  useEffect(() => {
    if (isStaleOrInvalid && !ctx.isInvalid) {
      sendToBackground({ type: "COMPLETE_BREAK" });
    }
  }, [isStaleOrInvalid, pendingBreak?.triggeredAt, ctx]);

  useEffect(() => {
    if (!pendingBreak) return;
    const exitIfFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => void 0);
      }
    };
    exitIfFullscreen();

    document.addEventListener("fullscreenchange", exitIfFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", exitIfFullscreen);
  }, [pendingBreak?.triggeredAt]);
  if (!pendingBreak || !breakType || isStaleOrInvalid) return null;

  if (pendingBreak.targetTabId && currentTabId !== pendingBreak.targetTabId) {
    return null;
  }
  if (
    state &&
    isUrlExcluded(window.location.href, state.settings.excludedSites)
  ) {
    return null;
  }
  const useCustomVideo =
    state?.settings.customVideoEnabled === true && customVideoDataUrl != null;
  const videoSrc = useCustomVideo
    ? customVideoDataUrl!
    : getVideoUrl(breakType);
  return (
    <BreakVideo
      key={pendingBreak.triggeredAt}
      ctx={ctx}
      breakType={breakType}
      videoSrc={videoSrc}
      useCustomVideo={useCustomVideo}
      soundEnabled={state?.settings.soundEnabled ?? true}
      freezeOnBreak={state?.settings.freezeOnBreak ?? true}
    />
  );
}
function BreakVideo({
  ctx,
  breakType,
  videoSrc,
  useCustomVideo,
  soundEnabled,
  freezeOnBreak,
}: {
  ctx: ContentScriptContext;
  breakType: ReturnType<typeof getBreakType>;
  videoSrc: string;
  useCustomVideo: boolean;
  soundEnabled: boolean;
  freezeOnBreak: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const stallTimerRef = useRef<number>();
  const complete = () => {
    if (ctx.isInvalid) return;
    sendToBackground({ type: "COMPLETE_BREAK" });
  };
  const clearStallTimer = () => {
    if (stallTimerRef.current !== undefined) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = undefined;
    }
  };
  useEffect(() => {
    if (videoFailed || ctx.isInvalid) return;
    const id = ctx.setTimeout(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) setVideoFailed(true);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [videoSrc, videoFailed, ctx]);

  useEffect(() => {
    if (!freezeOnBreak) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      if (root.style.overflow === "hidden") {
        root.style.overflow = prevOverflow;
      }
    };
  }, [freezeOnBreak]);
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
        video.muted = true;
        video.play().catch(() => void 0);
      });
    }
  }, [videoSrc, soundEnabled]);

  useEffect(() => {
    const id = ctx.setTimeout(
      () => complete(),
      (breakType.suggestedSeconds + 20) * 1000,
    );
    return () => window.clearTimeout(id);
  }, [breakType.id, ctx]);

  useEffect(() => {
    if (!freezeOnBreak) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") complete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [freezeOnBreak]);
  useEffect(() => {
    return () => clearStallTimer();
  }, []);

  const fallback = <div className="h-full w-full bg-black" />;
  const sourceVideo = (
    <video
      ref={videoRef}
      src={videoSrc}
      className="h-full w-full object-cover"
      style={{ display: videoFailed ? "none" : "block" }}
      autoPlay
      muted
      loop={false}
      playsInline
      disablePictureInPicture
      onEnded={complete}
      onError={() => {
        clearStallTimer();
        setVideoFailed(true);
      }}
      onStalled={() => {

        clearStallTimer();
        stallTimerRef.current = window.setTimeout(() => {
          setVideoFailed(true);
        }, 3000);
      }}
      onWaiting={() => {
        if (stallTimerRef.current !== undefined) return;
        stallTimerRef.current = window.setTimeout(() => {
          setVideoFailed(true);
        }, 3000);
      }}
      onPlaying={() => {
        clearStallTimer();
      }}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
  if (freezeOnBreak) {
    return (
      <div
        className="hammy-overlay-root hammy-overlay-in fixed inset-0 z-[2147483647]"
        role="dialog"
        aria-modal="true"
        aria-label={
          useCustomVideo ? "Break time" : `Hammy break: ${breakType.label}`
        }
      >
        {videoFailed ? fallback : sourceVideo}
      </div>
    );
  }
  return (
    <div
      className="hammy-overlay-root hammy-overlay-in fixed bottom-5 right-5 z-[2147483647] w-[240px] overflow-hidden rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.06]"
      role="status"
      aria-label={
        useCustomVideo ? "Break time" : `Hammy break: ${breakType.label}`
      }
    >
      <div className="relative aspect-[4/3] w-full bg-black">
        {videoFailed ? fallback : sourceVideo}
      </div>
    </div>
  );
}