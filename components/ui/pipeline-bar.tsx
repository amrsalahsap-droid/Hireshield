import React from "react";
import { Users, Mic, FileCheck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

interface PipelineStage {
  id: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
}

interface PipelineBarProps {
  stages: PipelineStage[];
  className?: string;
}

export function PipelineBar({ stages, className }: PipelineBarProps) {
  const maxCount = Math.max(...stages.map(stage => stage.count), 1);

  return (
    <div className={cn("bg-card shadow-card rounded-card border border-border p-card", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-section text-foreground font-display">Hiring Pipeline</h3>
      </div>

      {/* Pipeline Visualization */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-border">
          {stages.slice(0, -1).map((_, index) => {
            const progress = ((index + 1) / (stages.length - 1)) * 100;
            const currentStageCount = stages[index].count;
            const nextStageCount = stages[index + 1].count;
            const hasFlow = currentStageCount > 0 && nextStageCount > 0;
            
            return (
              <div
                key={index}
                className={cn(
                  "absolute top-0 h-1 transition-all duration-500",
                  hasFlow ? "bg-primary" : "bg-muted"
                )}
                style={{
                  left: `${(index / (stages.length - 1)) * 100}%`,
                  width: `${(1 / (stages.length - 1)) * 100}%`
                }}
              />
            );
          })}
        </div>

        {/* Stages */}
        <div className="relative flex justify-between">
          {stages.map((stage, index) => {
            const IconComponent = stage.icon;
            const isActive = stage.count > 0;
            const height = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            
            return (
              <div key={stage.id} className="flex flex-col items-center flex-1">
                {/* Stage Node */}
                <Tooltip content={stage.description}>
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300 mx-auto cursor-help",
                      isActive 
                        ? `${stage.bgColor} ${stage.color} border-current` 
                        : "bg-muted border-border text-muted-foreground"
                    )}
                  >
                    <IconComponent className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold font-display">
                      {stage.count}
                    </span>
                  </div>
                </Tooltip>
                
                {/* Stage Label */}
                <Tooltip content={stage.description}>
                  <p className={cn(
                    "text-card text-center mt-3 max-w-[80px] cursor-help transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {stage.label}
                  </p>
                </Tooltip>
                
                {/* Progress Bar */}
                {isActive && (
                  <div className="mt-2 w-full bg-muted rounded-full h-1 overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", stage.color)}
                      style={{ width: `${height}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-body-size text-muted-foreground font-body">Active flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-body-size text-muted-foreground font-body">No flow</span>
          </div>
          <span className="text-body-size text-muted-foreground font-body">
            Total: {stages.reduce((sum, stage) => sum + stage.count, 0)} candidates
          </span>
        </div>
      </div>
    </div>
  );
}
