"use client";

export interface Step {
  label: string;
  description: string;
  status: "idle" | "active" | "done" | "fail";
  value?: string;
  error?: string;
}

interface StepChainProps {
  steps: Step[];
}

export default function StepChain({ steps }: StepChainProps) {
  return (
    <div className="sim-steps">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`sim-step ${
            step.status === "active"
              ? "sim-step--active"
              : step.status === "done"
                ? "sim-step--done"
                : step.status === "fail"
                  ? "sim-step--fail"
                  : ""
          }`}
        >
          <div style={{ flex: 1 }}>
            <div className="sim-step-label">
              <span style={{ color: "#555", marginRight: 8 }}>STEP {i + 1}</span>
              {step.description}
            </div>
            {step.status === "active" && (
              <div className="sim-step-value" style={{ opacity: 0.5 }}>
                Processing...
              </div>
            )}
            {step.status === "done" && step.value && (
              <div className="sim-step-value">
                ✅ {step.value.length > 48 ? step.value.slice(0, 48) + "..." : step.value}
              </div>
            )}
            {step.status === "fail" && step.error && (
              <div className="sim-step-value sim-step-value--red">❌ {step.error}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
