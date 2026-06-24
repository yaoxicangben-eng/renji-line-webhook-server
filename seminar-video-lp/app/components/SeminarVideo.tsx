"use client";

import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";
import { useCallback, useEffect, useRef, useState } from "react";

type SeminarVideoProps = {
  initialMaxWatchedSeconds: number;
  initialSalesUnlocked: boolean;
  playbackId: string;
  placeholderTitle: string;
};

function PlaceholderVideo({ title }: { title: string }) {
  return (
    <div className="overflow-hidden border border-slate-900/10 bg-slate-950 shadow-panel">
      <div className="relative aspect-video">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#172033_0%,#243047_45%,#0d5630_100%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/35 bg-white/14 pl-1 shadow-lg sm:h-20 sm:w-20">
              <span className="block h-0 w-0 border-y-[13px] border-l-[20px] border-y-transparent border-l-white sm:border-y-[16px] sm:border-l-[25px]" />
            </div>
            <h1 className="mt-5 text-2xl font-black leading-tight sm:text-4xl">
              {title}
            </h1>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/45 to-transparent" />
      </div>
    </div>
  );
}

export function SeminarVideo({
  initialMaxWatchedSeconds,
  initialSalesUnlocked,
  playbackId,
  placeholderTitle,
}: SeminarVideoProps) {
  const playerRef = useRef<MuxPlayerElement | null>(null);
  const maxWatchedRef = useRef(initialMaxWatchedSeconds);
  const [salesUnlocked, setSalesUnlocked] = useState(initialSalesUnlocked);

  const saveProgress = useCallback(async (currentPositionSeconds: number) => {
    if (!playbackId.trim()) {
      return;
    }

    const response = await fetch("/api/video-progress", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        currentPositionSeconds,
        maxWatchedSeconds: maxWatchedRef.current,
      }),
    });

    if (!response.ok) {
      return;
    }

    const progress = (await response.json()) as {
      maxWatchedSeconds?: number;
      salesUnlocked?: boolean;
    };

    if (typeof progress.maxWatchedSeconds === "number") {
      maxWatchedRef.current = Math.max(maxWatchedRef.current, progress.maxWatchedSeconds);
    }

    if (progress.salesUnlocked && !salesUnlocked) {
      setSalesUnlocked(true);
      window.location.reload();
    }
  }, [playbackId, salesUnlocked]);

  function getPlayer() {
    return playerRef.current;
  }

  function handleTimeUpdate() {
    const player = getPlayer();
    if (!player) {
      return;
    }

    const currentTime = Math.max(0, Math.floor(player.currentTime ?? 0));
    maxWatchedRef.current = Math.max(maxWatchedRef.current, currentTime);
  }

  function handleSeeking() {
    const player = getPlayer();
    if (!player) {
      return;
    }

    const currentTime = Math.max(0, player.currentTime ?? 0);
    const allowedTime = maxWatchedRef.current + 1;

    if (currentTime > allowedTime) {
      player.currentTime = maxWatchedRef.current;
    }
  }

  function handleRateChange() {
    const player = getPlayer();
    if (!player) {
      return;
    }

    if (player.playbackRate && player.playbackRate !== 1) {
      player.playbackRate = 1;
    }
  }

  useEffect(() => {
    if (!playbackId.trim()) {
      return;
    }

    const timer = window.setInterval(() => {
      const player = getPlayer();
      void saveProgress(Math.floor(player?.currentTime ?? 0));
    }, 5000);

    return () => window.clearInterval(timer);
  }, [playbackId, saveProgress]);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
      {playbackId.trim() ? (
        <div className="overflow-hidden border border-slate-900/10 bg-slate-950 shadow-panel">
          <MuxPlayer
            ref={playerRef}
            playbackId={playbackId}
            metadata={{
              video_title: placeholderTitle,
            }}
            accentColor="#17a34a"
            className="block aspect-video w-full"
            onRateChange={handleRateChange}
            onSeeking={handleSeeking}
            onTimeUpdate={handleTimeUpdate}
            style={{
              aspectRatio: "16 / 9",
              width: "100%",
            }}
            streamType="on-demand"
          />
        </div>
      ) : (
        <PlaceholderVideo title={placeholderTitle} />
      )}
    </section>
  );
}
