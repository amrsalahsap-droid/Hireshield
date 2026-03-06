import React from "react";
import { PipelineBar } from "@/components/ui/pipeline-bar";
import { HiringVelocity } from "@/components/ui/hiring-velocity";

interface PipelinePanelProps {
  title: string;
  className?: string;
  stages: any[];
  hiringVelocity: any[];
}

export function PipelinePanel({ title, stages, hiringVelocity, className = "" }: PipelinePanelProps) {
  return (
    <div className={`rounded-card border border-border bg-card p-6 ${className}`}>
      {/* Panel Title */}
      <div className="mb-6">
        <h2 className="text-section text-foreground font-display font-semibold">
          {title}
        </h2>
        <div className="h-0.5 bg-border rounded-full mt-2"></div>
      </div>

      {/* Pipeline Content */}
      <div className="space-y-6">
        {/* Pipeline Bar */}
        <div className="bg-card border border-border rounded-card p-card">
          <PipelineBar stages={stages} />
        </div>

        {/* Hiring Velocity */}
        <HiringVelocity metrics={hiringVelocity} />
      </div>
    </div>
  );
}
