"use client";

import { useCallback, useState } from "react";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string; // e.g. "hex" | "base64"
  type?: "text" | "password";
  copyable?: boolean;
  optional?: boolean;
}

export default function InputField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
  copyable = true,
  optional = false,
}: InputFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [value]);

  return (
    <div className="sim-input-group">
      <label className="sim-label">
        {label}
        {hint && <span style={{ color: "#333", marginLeft: 6 }}>({hint})</span>}
        {optional && <span style={{ color: "#333", marginLeft: 6 }}>[optional]</span>}
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          className="sim-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
        />
        {copyable && value && (
          <button className="sim-copy-btn" onClick={handleCopy} type="button">
            {copied ? "✓" : "⧉"}
          </button>
        )}
      </div>
    </div>
  );
}
