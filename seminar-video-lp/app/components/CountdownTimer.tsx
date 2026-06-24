"use client";

import { useEffect, useMemo, useState } from "react";

type CountdownTimerProps = {
  expiresAt: string;
  serverNow: string;
};

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { value: String(hours).padStart(2, "0"), label: "時間" },
    { value: String(minutes).padStart(2, "0"), label: "分" },
    { value: String(seconds).padStart(2, "0"), label: "秒" },
  ];
}

export function CountdownTimer({ expiresAt, serverNow }: CountdownTimerProps) {
  const initialRemaining = useMemo(
    () => Math.max(0, Date.parse(expiresAt) - Date.parse(serverNow)),
    [expiresAt, serverNow],
  );
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const nextRemaining = Math.max(0, initialRemaining - (performance.now() - startedAt));
      setRemaining(nextRemaining);

      if (nextRemaining <= 0) {
        window.clearInterval(timer);
        window.location.reload();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [initialRemaining]);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="border-y border-line bg-white/88 px-4 py-4 shadow-panel backdrop-blur sm:px-6">
        <p className="text-center text-xs font-bold tracking-[0.18em] text-leafDark sm:text-sm">
          視聴期限
        </p>
        <div className="mx-auto mt-3 grid max-w-2xl grid-cols-3 gap-2 text-center sm:gap-3">
          {formatRemaining(remaining).map(({ value, label }) => (
            <div key={label} className="border border-line bg-mist px-2 py-3">
              <div className="text-2xl font-black leading-none text-ink sm:text-4xl">
                {value}
              </div>
              <div className="mt-1 text-[11px] font-bold text-slate-500 sm:text-xs">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
