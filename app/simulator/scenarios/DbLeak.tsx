"use client";

import { useState, useCallback, useRef } from "react";
import InputField from "../components/InputField";
import HexCounter from "../components/HexCounter";
import AnalysisTable from "../components/AnalysisTable";
import GlitchText from "../components/GlitchText";
import { deriveKeyExtractable, tryDecrypt, estimateBruteForceTime } from "../crypto-sim";

export default function DbLeak() {
  const [username, setUsername] = useState("");
  const [salt, setSalt] = useState("");
  const [sentinelCipher, setSentinelCipher] = useState("");
  const [sentinelIv, setSentinelIv] = useState("");
  const [noteTitleCipher, setNoteTitleCipher] = useState("");
  const [noteTitleIv, setNoteTitleIv] = useState("");
  const [guessPassword, setGuessPassword] = useState("");

  const [phase, setPhase] = useState<"idle" | "deriving" | "success" | "fail">("idle");
  const [counterRunning, setCounterRunning] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [bruteForceEstimate, setBruteForceEstimate] = useState("");
  const [derivedKeyHex, setDerivedKeyHex] = useState("");
  const [sentinelPlaintext, setSentinelPlaintext] = useState("");
  const [flashClass, setFlashClass] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const handleAttempt = useCallback(async () => {
    if (!salt || !sentinelCipher || !sentinelIv || !guessPassword) return;

    setPhase("deriving");
    setResultMsg("");
    setBruteForceEstimate("");
    setDerivedKeyHex("");
    setSentinelPlaintext("");
    setCounterRunning(true);

    try {
      const { key, keyHex, elapsedMs } = await deriveKeyExtractable(guessPassword, salt);
      setCounterRunning(false);
      setDerivedKeyHex(keyHex);

      const result = await tryDecrypt(key, sentinelCipher, sentinelIv);

      if (result.success) {
        setPhase("success");
        setSentinelPlaintext(result.plaintext || "");
        setResultMsg(`SENTINEL DECRYPTED — password confirmed`);
        setFlashClass("sim-card--flash-green");
      } else {
        setPhase("fail");
        setResultMsg(`DECRYPTION FAILED — AES-GCM authentication tag mismatch`);
        setBruteForceEstimate(
          `Attacker must try again. At 200,000 iterations per guess, cracking an 8-char random password would take ${estimateBruteForceTime(elapsedMs)} on this device.`
        );
        setFlashClass("sim-card--flash-red");
      }

      setTimeout(() => setFlashClass(""), 500);
    } catch (err) {
      setPhase("fail");
      setCounterRunning(false);
      setResultMsg(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [salt, sentinelCipher, sentinelIv, guessPassword]);

  const handleReset = () => {
    setPhase("idle");
    setCounterRunning(false);
    setResultMsg("");
    setBruteForceEstimate("");
    setDerivedKeyHex("");
    setSentinelPlaintext("");
    setFlashClass("");
  };

  return (
    <div className="sim-panel">
      <div className="sim-description">
        An attacker has dumped your entire Supabase database. Here is everything they can see.
      </div>

      {/* Inputs */}
      <div className={`sim-card ${flashClass}`} ref={cardRef}>
        <div className="sim-section-title">DATABASE DUMP</div>
        <InputField
          label="username"
          value={username}
          onChange={setUsername}
          placeholder="srikar"
        />
        <InputField
          label="salt"
          value={salt}
          onChange={setSalt}
          placeholder="a3f9bc2d7e1f..."
          hint="hex"
        />
        <div className="sim-input-row">
          <InputField
            label="sentinel_cipher"
            value={sentinelCipher}
            onChange={setSentinelCipher}
            placeholder="Yw+9fLmK..."
            hint="base64"
          />
          <InputField
            label="sentinel_iv"
            value={sentinelIv}
            onChange={setSentinelIv}
            placeholder="dGhpcyBp..."
            hint="base64"
          />
        </div>
        <div className="sim-input-row">
          <InputField
            label="note_title_cipher"
            value={noteTitleCipher}
            onChange={setNoteTitleCipher}
            placeholder="(optional)"
            hint="base64"
            optional
          />
          <InputField
            label="note_title_iv"
            value={noteTitleIv}
            onChange={setNoteTitleIv}
            placeholder="(optional)"
            hint="base64"
            optional
          />
        </div>
      </div>

      {/* Password guess */}
      <div className="sim-card">
        <div className="sim-section-title">PASSWORD GUESS</div>
        <InputField
          label="Attacker guesses password"
          value={guessPassword}
          onChange={setGuessPassword}
          placeholder="Enter a password guess..."
          type="text"
        />

        <div className="sim-actions">
          <button
            className="sim-btn sim-btn--attack"
            onClick={handleAttempt}
            disabled={phase === "deriving" || !salt || !sentinelCipher || !sentinelIv || !guessPassword}
          >
            {phase === "deriving" ? "RUNNING..." : "⚡ ATTEMPT CRACK"}
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

        {derivedKeyHex && (
          <div className="sim-hex" style={{ marginTop: 12 }}>
            <span>derivedKey: {derivedKeyHex.slice(0, 32)}...</span>
          </div>
        )}

        {resultMsg && (
          <div className={`sim-result ${phase === "success" ? "sim-result--success" : "sim-result--fail"}`}>
            <span>{phase === "success" ? "🟢" : "🔴"}</span>
            <span>{resultMsg}</span>
          </div>
        )}

        {bruteForceEstimate && (
          <div className="sim-result sim-result--warn">
            <span>⏱️</span>
            <span>{bruteForceEstimate}</span>
          </div>
        )}

        {phase === "success" && sentinelPlaintext && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#666" }}>
                password → derivedKey → noteKey → note content revealed
              </span>
            </div>
            <GlitchText text="CRACKED" variant="success" active />
          </div>
        )}
      </div>

      {/* Static Analysis */}
      <div className="sim-card">
        <div className="sim-section-title">STATIC ANALYSIS</div>
        <AnalysisTable
          leftTitle="ATTACKER SEES"
          rightTitle="ATTACKER CANNOT"
          leftItems={[
            { icon: "✅", text: "username (plaintext)" },
            { icon: "✅", text: "salt (public by design)" },
            { icon: "✅", text: "sentinel_cipher (ciphertext)" },
            { icon: "✅", text: "note ciphertexts (blobs)" },
            { icon: "✅", text: "ECDH public key" },
          ]}
          rightItems={[
            { icon: "❌", text: "Read note content" },
            { icon: "❌", text: "Login without password" },
            { icon: "❌", text: "Derive encryption key" },
            { icon: "❌", text: "Decrypt any title or content" },
            { icon: "❌", text: "Brute force (PBKDF2 cost)" },
          ]}
        />

        <div className="sim-risk sim-risk--low">🟢 Risk Level: LOW</div>
        <div className="sim-risk-note">
          &ldquo;The database alone reveals nothing sensitive. Every secret is protected by your
          password which is never stored.&rdquo;
        </div>
      </div>
    </div>
  );
}
