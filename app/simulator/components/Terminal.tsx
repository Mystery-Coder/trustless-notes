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
    if (!running) {
      setVisibleLines([]);
      setShowCursor(false);
      return;
    }

    setShowCursor(true);
    let idx = 0;

    const addLine = () => {
      if (idx < lines.length) {
        setVisibleLines((prev) => [...prev, lines[idx]]);
        idx++;
        timerRef.current = setTimeout(addLine, typingSpeed);
      } else {
        setShowCursor(false);
        onComplete?.();
      }
    };

    timerRef.current = setTimeout(addLine, 300);
    return () => clearTimeout(timerRef.current);
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
        {visibleLines.map((line, i) => (
          <div key={i} className={`sim-terminal-line sim-terminal-line--${line.type}`}>
            {line.type === "cmd" ? `$ ${line.text}` : line.type === "comment" ? `# ${line.text}` : `> ${line.text}`}
          </div>
        ))}
        {showCursor && <span className="sim-terminal-cursor" />}
      </div>
    </div>
  );
}
