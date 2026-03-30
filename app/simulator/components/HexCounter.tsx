"use client";

import { useEffect, useRef, useState } from "react";

interface HexCounterProps {
  target: number;
  duration?: number; // ms
  running: boolean;
  onComplete?: () => void;
  label?: string;
}

export default function HexCounter({
  target,
  duration = 1500,
  running,
  onComplete,
  label = "Running PBKDF2",
}: HexCounterProps) {
  const [value, setValue] = useState(0);
  const [pct, setPct] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!running) {
      setValue(0);
      setPct(0);
      return;
    }

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * target);

      setValue(current);
      setPct(Math.floor(progress * 100));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        setPct(100);
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, target, duration, onComplete]);

  if (!running && value === 0) return null;

  return (
    <div className="sim-progress-wrap">
      <div className="sim-progress-label">
        <span>{label} —</span>
        <span className="sim-counter">
          {value.toLocaleString()} / {target.toLocaleString()}
        </span>
        <span>iterations</span>
      </div>
      <div className="sim-progress-bar">
        <div
          className="sim-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
