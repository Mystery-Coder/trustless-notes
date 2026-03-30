"use client";

export interface AnalysisItem {
  icon: string; // ✅ or ❌
  text: string;
}

interface AnalysisTableProps {
  leftTitle: string;
  rightTitle: string;
  leftItems: AnalysisItem[];
  rightItems: AnalysisItem[];
}

export default function AnalysisTable({
  leftTitle,
  rightTitle,
  leftItems,
  rightItems,
}: AnalysisTableProps) {
  return (
    <div className="sim-analysis">
      <div className="sim-analysis-col">
        <div className="sim-analysis-header">{leftTitle}</div>
        {leftItems.map((item, i) => (
          <div key={i} className="sim-analysis-item">
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
      <div className="sim-analysis-col">
        <div className="sim-analysis-header">{rightTitle}</div>
        {rightItems.map((item, i) => (
          <div key={i} className="sim-analysis-item">
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
