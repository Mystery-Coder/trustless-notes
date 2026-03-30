"use client";

import { useState, useCallback, useMemo } from "react";
import InputField from "../components/InputField";
import Terminal, { type TerminalLine } from "../components/Terminal";
import AnalysisTable from "../components/AnalysisTable";

export default function SupabaseKeyLeak() {
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [running, setRunning] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const terminalLines: TerminalLine[] = useMemo(() => {
    const key = serviceRoleKey || "eyJhbGciOiJIUzI1NiIs...";
    return [
      { text: `curl https://[project].supabase.co/rest/v1/users \\`, type: "cmd" as const },
      { text: `  -H "apikey: ${key.slice(0, 24)}..." \\`, type: "response" as const },
      { text: `  -H "Authorization: Bearer ${key.slice(0, 24)}..."`, type: "response" as const },
      { text: "", type: "response" as const },
      { text: "HTTP 200 OK", type: "cmd" as const },
      { text: "{", type: "response" as const },
      { text: '  "username": "srikar",', type: "response" as const },
      { text: '  "salt": "a3f9bc2d7e1f4a82...",', type: "response" as const },
      { text: '  "sentinel_cipher": "Yw+9fLmK...",', type: "response" as const },
      { text: '  "ecdh_public_key": "MFkwEwYH...",', type: "response" as const },
      { text: "}", type: "response" as const },
      { text: "", type: "response" as const },
      { text: "Attacker now queries notes table...", type: "comment" as const },
      { text: '{ "content_cipher": "xK92fL3m...", ... }', type: "response" as const },
      { text: '{ "content_cipher": "pQ7vR2sN...", ... }', type: "response" as const },
      { text: "", type: "response" as const },
      { text: "Attempting to read plaintext...", type: "comment" as const },
      { text: "ERROR: Data is AES-256-GCM encrypted", type: "error" as const },
      { text: "Cannot decrypt without user password", type: "error" as const },
      { text: "Service role key grants DB access, not cryptographic access", type: "error" as const },
    ];
  }, [serviceRoleKey]);

  const handleSimulate = useCallback(() => {
    setRunning(true);
    setShowSummary(false);
  }, []);

  const handleTerminalComplete = useCallback(() => {
    setShowSummary(true);
  }, []);

  const handleReset = () => {
    setRunning(false);
    setShowSummary(false);
  };

  return (
    <div className="sim-panel">
      <div className="sim-description">
        An attacker has obtained your SUPABASE_SERVICE_ROLE_KEY from a leaked .env file, GitHub
        commit, or compromised CI/CD pipeline.
      </div>

      <div className="sim-card">
        <div className="sim-section-title">LEAKED CREDENTIAL</div>
        <InputField
          label="service_role_key"
          value={serviceRoleKey}
          onChange={setServiceRoleKey}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        />

        <div className="sim-actions">
          <button
            className="sim-btn sim-btn--attack"
            onClick={handleSimulate}
            disabled={running}
          >
            {running ? "SIMULATING..." : "⚡ SIMULATE DB ACCESS"}
          </button>
          <button className="sim-btn sim-btn--reset" onClick={handleReset}>RESET</button>
        </div>
      </div>

      <Terminal
        lines={terminalLines}
        running={running}
        typingSpeed={140}
        onComplete={handleTerminalComplete}
      />

      {showSummary && (
        <div className="sim-card" style={{ animation: "sim-fade-up 0.3s ease both" }}>
          <div className="sim-section-title">IMPACT ASSESSMENT</div>

          <AnalysisTable
            leftTitle="ATTACKER CAN"
            rightTitle="ATTACKER CANNOT"
            leftItems={[
              { icon: "✅", text: "Full read/write access to all DB rows" },
              { icon: "✅", text: "Delete all users and notes" },
              { icon: "✅", text: "Insert fake data" },
            ]}
            rightItems={[
              { icon: "❌", text: "Decrypt a single note" },
              { icon: "❌", text: "Derive any user's encryption key" },
              { icon: "❌", text: "Learn any user's password" },
            ]}
          />

          <div className="sim-risk sim-risk--medium">🟡 Risk Level: MEDIUM</div>
          <div className="sim-risk-note">
            &ldquo;Infrastructure-level access is catastrophic for data integrity but cannot break
            confidentiality. This is the trustless guarantee — the server is architecturally
            incapable of reading your notes.&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
