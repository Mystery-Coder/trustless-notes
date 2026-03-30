"use client";

import { useEffect, useState } from "react";

interface GlitchTextProps {
  text: string;
  variant: "success" | "danger";
  active?: boolean;
}

export default function GlitchText({ text, variant, active = true }: GlitchTextProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (active) {
      setIsActive(true);
      const timer = setTimeout(() => setIsActive(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <div
      className={`sim-glitch ${variant === "success" ? "sim-glitch--green" : "sim-glitch--red"}`}
      data-active={isActive}
      data-text={text}
    >
      {text}
    </div>
  );
}
