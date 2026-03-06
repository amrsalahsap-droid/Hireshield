import React from "react";

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div className={`rounded-card border border-border bg-card p-6 ${className}`}>
      {/* Panel Title */}
      <div className="mb-6">
        <h2 className="text-section text-foreground font-display font-semibold">
          {title}
        </h2>
        <div className="h-0.5 bg-border rounded-full mt-2"></div>
      </div>

      {/* Panel Content */}
      {children}
    </div>
  );
}
