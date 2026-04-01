"use client";

import { useEffect, useRef, useState } from "react";

export interface TerminalLine {
  text: string;
  type: "cmd" | "response" | "error" | "comment";
}

interface TerminalProps {
  lines: TerminalLine[];
  running: boolean;
  typingSpeed?: number; // ms per line
  onComplete?: () => void;
}

export default function Terminal({
  lines,
  running,
  typingSpeed = 120,
  onComplete,
}: TerminalProps) {
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([]);
  const [showCursor, setShowCursor] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Always reset on every effect invocation — this handles both the
    // `running = false` (reset) case AND React StrictMode's double-invoke,
    // which would otherwise leave stale items in visibleLines from the first
    // cancelled run, causing `line` to be undefined on the second render pass.
    setVisibleLines([]);
    setShowCursor(false);

    if (!running) return;

    setShowCursor(true);
    let idx = 0;
    let cancelled = false;

    const addLine = () => {
      if (cancelled) return;
      if (idx < lines.length) {
        const line = lines[idx];
        if (line) setVisibleLines((prev) => [...prev, line]);
        idx++;
        timerRef.current = setTimeout(addLine, typingSpeed);
      } else {
        setShowCursor(false);
        onComplete?.();
      }
    };

    timerRef.current = setTimeout(addLine, 300);
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [running, lines, typingSpeed, onComplete]);

  // Auto-scroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <div className="sim-terminal">
      <div className="sim-terminal-bar">
        <div className="sim-terminal-dot sim-terminal-dot--red" />
        <div className="sim-terminal-dot sim-terminal-dot--yellow" />
        <div className="sim-terminal-dot sim-terminal-dot--green" />
        <span className="sim-terminal-title">attacker@kali ~ $</span>
      </div>
      <div className="sim-terminal-body" ref={bodyRef}>
        {visibleLines.filter(Boolean).map((line, i) => (
          <div key={i} className={`sim-terminal-line sim-terminal-line--${line.type}`}>
            {line.type === "cmd" ? `$ ${line.text}` : line.type === "comment" ? `# ${line.text}` : `> ${line.text}`}
          </div>
        ))}
        {showCursor && <span className="sim-terminal-cursor" />}
      </div>
    </div>
  );
}
