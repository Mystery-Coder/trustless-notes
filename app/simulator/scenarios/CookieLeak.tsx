"use client";

import { useState, useCallback } from "react";
import InputField from "../components/InputField";
import AnalysisTable from "../components/AnalysisTable";
import GlitchText from "../components/GlitchText";
import { hmacSign } from "../crypto-sim";

type SubTab = "unsigned" | "signed";

export default function CookieLeak() {
  const [subTab, setSubTab] = useState<SubTab>("unsigned");

  return (
    <div className="sim-panel">
      <div className="sim-description">
        An attacker has stolen a valid session cookie — via XSS, network sniffing on HTTP, or
        physical device access.
      </div>

      <div className="sim-subtabs">
        <button
          className={`sim-subtab ${subTab === "unsigned" ? "sim-subtab--active" : ""}`}
          onClick={() => setSubTab("unsigned")}
        >
          UNSIGNED COOKIE
        </button>
        <button
          className={`sim-subtab ${subTab === "signed" ? "sim-subtab--active" : ""}`}
          onClick={() => setSubTab("signed")}
        >
          SIGNED COOKIE
        </button>
      </div>

      {subTab === "unsigned" ? <UnsignedTab /> : <SignedTab />}

      {/* Comparison */}
      <div className="sim-card">
        <div className="sim-section-title">COMPARISON</div>
        <AnalysisTable
          leftTitle="UNSIGNED COOKIE"
          rightTitle="SIGNED COOKIE"
          leftItems={[
            { icon: "✅", text: "Can impersonate anyone" },
            { icon: "✅", text: "Can destroy victim's notes" },
            { icon: "❌", text: "Cannot decrypt anything" },
            { icon: "❌", text: "Cannot read note content" },
          ]}
          rightItems={[
            { icon: "❌", text: "Cannot forge identity" },
            { icon: "✅", text: "Can destroy notes if stolen" },
            { icon: "❌", text: "Cannot decrypt anything" },
            { icon: "❌", text: "Cannot read note content" },
          ]}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="sim-risk sim-risk--high">🔴 Unsigned: HIGH (identity forgery)</div>
          <div className="sim-risk sim-risk--medium">🟡 Signed: MEDIUM (destructive only)</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Unsigned Cookie Sub-tab ──────────────────────────────── */

function UnsignedTab() {
  const [cookieValue, setCookieValue] = useState("username=srikar");
  const [impersonateTarget, setImpersonateTarget] = useState("");
  const [phase, setPhase] = useState<"idle" | "forging" | "done">("idle");
  const [showDecryptFail, setShowDecryptFail] = useState(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleForge = useCallback(async () => {
    if (!impersonateTarget) return;
    setPhase("forging");
    setShowDecryptFail(false);

    await sleep(800);
    setPhase("done");

    await sleep(1200);
    setShowDecryptFail(true);
  }, [impersonateTarget]);

  const handleReset = () => {
    setPhase("idle");
    setShowDecryptFail(false);
  };

  // Parse username from cookie
  const originalUser = cookieValue.split("=")[1] || "srikar";
  const forgedCookie = `username=${impersonateTarget || "victim"}`;

  return (
    <div className="sim-card">
      <div className="sim-section-title">UNSIGNED COOKIE FORGERY</div>

      <InputField
        label="Cookie value"
        value={cookieValue}
        onChange={setCookieValue}
        placeholder="username=srikar"
      />
      <InputField
        label="Attacker wants to impersonate"
        value={impersonateTarget}
        onChange={setImpersonateTarget}
        placeholder="victim"
      />

      <div className="sim-actions">
        <button
          className="sim-btn sim-btn--attack"
          onClick={handleForge}
          disabled={phase === "forging" || !impersonateTarget}
        >
          {phase === "forging" ? "FORGING..." : "⚡ FORGE COOKIE"}
        </button>
        <button className="sim-btn sim-btn--reset" onClick={handleReset}>RESET</button>
      </div>

      {phase !== "idle" && (
        <>
          <div className="sim-cookie-edit">
            <span className="sim-cookie-old">username={originalUser}</span>
            <span className="sim-cookie-arrow">→</span>
            <span className="sim-cookie-new">{forgedCookie}</span>
          </div>

          {phase === "done" && (
            <>
              <div className="sim-result sim-result--success">
                <span>✅</span>
                <span>Cookie accepted by server — no signature to verify</span>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="sim-section-title">SERVER RETURNS ENCRYPTED BLOBS</div>
                <div className="sim-hex">
                  sentinel_cipher: &quot;Yw+9fLmK3x...&quot; (encrypted)
                </div>
                <div className="sim-hex" style={{ marginTop: 6 }}>
                  notes: [&#123; content_cipher: &quot;xK92fL3m...&quot; &#125;, ...] (encrypted)
                </div>
              </div>
            </>
          )}

          {showDecryptFail && (
            <div className="sim-result sim-result--fail">
              <span>❌</span>
              <span>
                No derivedKey in attacker&apos;s browser — decryption impossible. The attacker has
                ciphertext but cannot read a single character of content.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Signed Cookie Sub-tab ────────────────────────────────── */

function SignedTab() {
  const [signedCookie, setSignedCookie] = useState("srikar.a3f9bc2d7e1f4a82");
  const [forgeTarget, setForgeTarget] = useState("");
  const [phase, setPhase] = useState<"idle" | "forging" | "hmac-fail" | "real-stolen">("idle");
  const [wrongHmac, setWrongHmac] = useState("");

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleForge = useCallback(async () => {
    if (!forgeTarget) return;
    setPhase("forging");
    setWrongHmac("");

    await sleep(500);

    // Generate a wrong HMAC to show mismatch
    const fakeHmac = await hmacSign(
      forgeTarget,
      "deadbeefcafebabe1234567890abcdef" // random "wrong" server secret
    );
    setWrongHmac(fakeHmac.slice(0, 16));

    await sleep(400);
    setPhase("hmac-fail");

    await sleep(2000);
    setPhase("real-stolen");
  }, [forgeTarget]);

  const handleReset = () => {
    setPhase("idle");
    setWrongHmac("");
  };

  const parts = signedCookie.split(".");
  const originalUser = parts[0] || "srikar";
  const originalSig = parts[1] || "a3f9bc2d...";

  return (
    <div className="sim-card">
      <div className="sim-section-title">SIGNED COOKIE ATTACK</div>

      <InputField
        label="Signed cookie"
        value={signedCookie}
        onChange={setSignedCookie}
        placeholder="srikar.a3f9bc2d7e1f4a82"
      />
      <InputField
        label="Attacker tries to change username to"
        value={forgeTarget}
        onChange={setForgeTarget}
        placeholder="admin"
      />

      <div className="sim-actions">
        <button
          className="sim-btn sim-btn--attack"
          onClick={handleForge}
          disabled={phase === "forging" || !forgeTarget}
        >
          {phase === "forging" ? "COMPUTING..." : "⚡ ATTEMPT FORGE"}
        </button>
        <button className="sim-btn sim-btn--reset" onClick={handleReset}>RESET</button>
      </div>

      {phase !== "idle" && (
        <>
          <div className="sim-cookie-edit">
            <span className="sim-cookie-old">
              {originalUser}.{originalSig}
            </span>
            <span className="sim-cookie-arrow">→</span>
            <span className="sim-cookie-new">
              {forgeTarget}.{wrongHmac || "???"}
            </span>
          </div>
        </>
      )}

      {(phase === "hmac-fail" || phase === "real-stolen") && (
        <div className="sim-result sim-result--fail">
          <span>🔴</span>
          <span>
            HMAC VERIFICATION FAILED — cookie rejected. Server secret ≠ attacker&apos;s guess.
          </span>
        </div>
      )}

      {phase === "real-stolen" && (
        <>
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "#0a0a0a",
              borderRadius: 8,
              border: "1px solid #1f1f1f",
            }}
          >
            <div className="sim-section-title" style={{ color: "#ffcc00" }}>
              BUT WHAT IF THEY STEAL THE REAL SIGNED COOKIE VIA XSS?
            </div>

            <div className="sim-result sim-result--warn">
              <span>⚠️</span>
              <span>
                Attacker has the real cookie → API returns ciphertext → but no derivedKey in their
                browser → still can&apos;t decrypt
              </span>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="sim-section-title">WHAT ATTACKER CAN DO</div>
              <div className="sim-analysis-item" style={{ marginBottom: 4 }}>
                <span>✅</span>
                <span>Delete notes (API call with valid session)</span>
              </div>
              <div className="sim-analysis-item" style={{ marginBottom: 4 }}>
                <span>✅</span>
                <span>Overwrite notes with garbage ciphertext</span>
              </div>
              <div className="sim-analysis-item" style={{ marginBottom: 4 }}>
                <span>❌</span>
                <span>Read any note content</span>
              </div>
              <div className="sim-analysis-item">
                <span>❌</span>
                <span>Obtain the encryption key</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
