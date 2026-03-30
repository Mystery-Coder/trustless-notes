"use client";

import { useState } from "react";
import "./simulator.css";
import DbLeak from "./scenarios/DbLeak";
import PasswordLeak from "./scenarios/PasswordLeak";
import CookieLeak from "./scenarios/CookieLeak";
import SupabaseKeyLeak from "./scenarios/SupabaseKeyLeak";

type Scenario = "db" | "password" | "cookie" | "supabase";

const TABS: { id: Scenario; icon: string; label: string }[] = [
  { id: "db", icon: "🗄️", label: "DB LEAK" },
  { id: "password", icon: "🔑", label: "PASSWORD LEAK" },
  { id: "cookie", icon: "🍪", label: "COOKIE LEAK" },
  { id: "supabase", icon: "🔐", label: "SUPABASE KEY LEAK" },
];

const COMPARISON = [
  {
    vector: "DB Leaked",
    traditional: { text: "Notes exposed", level: "high" },
    trustless: { text: "Ciphertext only", level: "low" },
    proton: { text: "Ciphertext only", level: "low" },
  },
  {
    vector: "Password Leaked",
    traditional: { text: "Full access", level: "high" },
    trustless: { text: "Full access", level: "high" },
    proton: { text: "Full access", level: "high" },
  },
  {
    vector: "Server Compromised",
    traditional: { text: "All data readable", level: "high" },
    trustless: { text: "Still encrypted", level: "low" },
    proton: { text: "Still encrypted", level: "low" },
  },
  {
    vector: "Insider Threat",
    traditional: { text: "Admin reads everything", level: "high" },
    trustless: { text: "Sees blobs only", level: "low" },
    proton: { text: "Sees blobs only", level: "low" },
  },
  {
    vector: "Cookie Stolen",
    traditional: { text: "Full account access", level: "high" },
    trustless: { text: "Destructive only", level: "medium" },
    proton: { text: "Destructive only", level: "medium" },
  },
];

function levelIcon(level: string) {
  if (level === "high") return "🔴";
  if (level === "medium") return "🟡";
  return "🟢";
}

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState<Scenario>("db");

  return (
    <div className="sim-root sim-scanlines">
      {/* Animated grid background */}
      <div className="sim-grid-bg" />

      <div className="sim-content">
        {/* Header */}
        <header className="sim-header">
          <h1 className="sim-title">TRUSTLESS SECURITY SIMULATOR</h1>
          <p className="sim-subtitle">
            Enter leaked data. Watch what an attacker can — and cannot — do.
          </p>
          <span className="sim-tag">
            All cryptography runs in your browser. Nothing is sent to any server.
          </span>
        </header>

        {/* Scenario tabs */}
        <div className="sim-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`sim-tab ${activeTab === tab.id ? "sim-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}&nbsp;&nbsp;{tab.label}
            </button>
          ))}
        </div>

        {/* Active scenario */}
        <div className="sim-panel-wrapper" key={activeTab}>
          {activeTab === "db" && <DbLeak />}
          {activeTab === "password" && <PasswordLeak />}
          {activeTab === "cookie" && <CookieLeak />}
          {activeTab === "supabase" && <SupabaseKeyLeak />}
        </div>

        {/* Comparative Analysis */}
        <div style={{ marginTop: 48 }}>
          <div className="sim-card">
            <div className="sim-section-title">COMPARATIVE ANALYSIS</div>
            <table className="sim-compare">
              <thead>
                <tr>
                  <th>Attack Vector</th>
                  <th>Traditional App</th>
                  <th>Trustless Notes</th>
                  <th>ProtonMail</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.vector}>
                    <td style={{ color: "#888", fontWeight: 500 }}>{row.vector}</td>
                    <td>
                      {levelIcon(row.traditional.level)} {row.traditional.text}
                    </td>
                    <td>
                      {levelIcon(row.trustless.level)} {row.trustless.text}
                    </td>
                    <td>
                      {levelIcon(row.proton.level)} {row.proton.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p
              style={{
                fontSize: 12,
                color: "#555",
                textAlign: "center",
                marginTop: 12,
                fontStyle: "italic",
              }}
            >
              Trustless architecture closes the gap between consumer apps and enterprise E2EE
              solutions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
