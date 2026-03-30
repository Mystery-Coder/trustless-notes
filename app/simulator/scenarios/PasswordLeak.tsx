"use client";

import { useState, useCallback } from "react";
import InputField from "../components/InputField";
import HexCounter from "../components/HexCounter";
import StepChain, { type Step } from "../components/StepChain";
import GlitchText from "../components/GlitchText";
import { fullAttackChain } from "../crypto-sim";

export default function PasswordLeak() {
  const [password, setPassword] = useState("");
  const [salt, setSalt] = useState("");
  const [sentinelCipher, setSentinelCipher] = useState("");
  const [sentinelIv, setSentinelIv] = useState("");
  const [wrappedKeyCipher, setWrappedKeyCipher] = useState("");
  const [wrappedKeyIv, setWrappedKeyIv] = useState("");
  const [contentCipher, setContentCipher] = useState("");
  const [contentIv, setContentIv] = useState("");

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [counterRunning, setCounterRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([
    { label: "step1", description: "[password] ──PBKDF2 200k──► [derivedKey]", status: "idle" },
    { label: "step2", description: '[derivedKey] ──AES-GCM──► [sentinel: "VALID_PASSWORD"]', status: "idle" },
    { label: "step3", description: "[derivedKey] ──unwrap──► [noteKey]", status: "idle" },
    { label: "step4", description: "[noteKey] ──AES-GCM──► [note content revealed]", status: "idle" },
  ]);
  const [revealedContent, setRevealedContent] = useState("");
  const [displayedContent, setDisplayedContent] = useState("");
  const [compromised, setCompromised] = useState(false);

  const updateStep = (index: number, update: Partial<Step>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...update } : s))
    );
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleAttack = useCallback(async () => {
    if (!password || !salt || !sentinelCipher || !sentinelIv) return;

    setPhase("running");
    setCompromised(false);
    setRevealedContent("");
    setDisplayedContent("");
    setSteps((prev) => prev.map((s) => ({ ...s, status: "idle" as const, value: undefined, error: undefined })));

    // Step 1: PBKDF2
    updateStep(0, { status: "active" });
    setCounterRunning(true);

    const result = await fullAttackChain(
      password,
      salt,
      sentinelCipher,
      sentinelIv,
      wrappedKeyCipher,
      wrappedKeyIv,
      contentCipher,
      contentIv
    );

    setCounterRunning(false);

    // Animate steps sequentially
    for (let i = 0; i < result.steps.length; i++) {
      const stepResult = result.steps[i];
      updateStep(i, { status: "active" });
      await sleep(600);
      updateStep(i, {
        status: stepResult.success ? "done" : "fail",
        value: stepResult.value,
        error: stepResult.error,
      });

      if (!stepResult.success) {
        setPhase("done");
        return;
      }
      await sleep(400);
    }

    // Typewriter effect for content
    if (result.contentPlaintext) {
      setRevealedContent(result.contentPlaintext);
      const text = result.contentPlaintext;
      for (let i = 0; i <= text.length; i++) {
        setDisplayedContent(text.slice(0, i));
        await sleep(30);
      }
    }

    setCompromised(true);
    setPhase("done");
  }, [password, salt, sentinelCipher, sentinelIv, wrappedKeyCipher, wrappedKeyIv, contentCipher, contentIv]);

  const handleReset = () => {
    setPhase("idle");
    setCounterRunning(false);
    setCompromised(false);
    setRevealedContent("");
    setDisplayedContent("");
    setSteps((prev) =>
      prev.map((s) => ({ ...s, status: "idle" as const, value: undefined, error: undefined }))
    );
  };

  return (
    <div className="sim-panel">
      <div className="sim-description">
        An attacker has obtained the user&apos;s password — through phishing, reuse from another
        breach, or social engineering.
      </div>

      <div className="sim-card">
        <div className="sim-section-title">LEAKED DATA</div>
        <InputField label="password" value={password} onChange={setPassword} placeholder="user's password" />
        <InputField label="salt" value={salt} onChange={setSalt} placeholder="hex string" hint="hex" />
        <div className="sim-input-row">
          <InputField label="sentinel_cipher" value={sentinelCipher} onChange={setSentinelCipher} hint="base64" />
          <InputField label="sentinel_iv" value={sentinelIv} onChange={setSentinelIv} hint="base64" />
        </div>
        <div className="sim-input-row">
          <InputField label="wrapped_key_cipher" value={wrappedKeyCipher} onChange={setWrappedKeyCipher} hint="base64" />
          <InputField label="wrapped_key_iv" value={wrappedKeyIv} onChange={setWrappedKeyIv} hint="base64" />
        </div>
        <div className="sim-input-row">
          <InputField label="content_cipher" value={contentCipher} onChange={setContentCipher} hint="base64" />
          <InputField label="content_iv" value={contentIv} onChange={setContentIv} hint="base64" />
        </div>
      </div>

      <div className="sim-card">
        <div className="sim-section-title">ATTACK CHAIN</div>

        <div className="sim-actions">
          <button
            className="sim-btn sim-btn--attack"
            onClick={handleAttack}
            disabled={phase === "running" || !password || !salt || !sentinelCipher || !sentinelIv}
          >
            {phase === "running" ? "EXECUTING..." : "⚡ EXECUTE ATTACK"}
          </button>
          <button className="sim-btn sim-btn--reset" onClick={handleReset}>
            RESET
          </button>
        </div>

        <HexCounter
          target={200000}
          duration={1500}
          running={counterRunning}
          label="Running PBKDF2 — 200,000 iterations"
        />

        <StepChain steps={steps} />

        {displayedContent && (
          <div style={{ marginTop: 16 }}>
            <div className="sim-section-title">DECRYPTED CONTENT</div>
            <div
              style={{
                padding: 16,
                background: "#050505",
                borderRadius: 8,
                border: "1px solid #1f1f1f",
                fontSize: 14,
                color: "#39ff14",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {displayedContent}
              {displayedContent.length < revealedContent.length && (
                <span className="sim-terminal-cursor" />
              )}
            </div>
          </div>
        )}

        {compromised && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <GlitchText text="FULLY COMPROMISED" variant="danger" active />
            <p style={{ marginTop: 16, fontSize: 12, color: "#888", lineHeight: 1.7, maxWidth: 600, margin: "16px auto 0" }}>
              Every note, every title, every piece of data is now readable. This is the single point
              of failure of any password-based encryption system — including iCloud, ProtonMail, and
              1Password.
            </p>
          </div>
        )}
      </div>

      <div className="sim-card">
        <div className="sim-risk sim-risk--high">🔴 Risk Level: HIGH</div>
        <div className="sim-risk-note">
          &ldquo;Password compromise is catastrophic but inevitable in any encryption system. The
          mitigation is password strength and uniqueness — unlike traditional apps, this breach does
          not expose a reusable password hash.&rdquo;
        </div>
      </div>
    </div>
  );
}
