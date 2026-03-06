import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ children, content, className, side = "top", delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
  };

  const arrowClasses = {
    top: "top-full left-1/2 transform -translate-x-1/2 -mt-1 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 transform -translate-y-1/2 -ml-1 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 transform -translate-y-1/2 -mr-1 border-t-transparent border-b-transparent border-l-transparent"
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="cursor-help"
      >
        {children}
      </div>
      
      {isVisible && (
        <div className={cn(
          "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg border border-gray-700 max-w-xs",
          "pointer-events-none",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          positionClasses[side]
        )}>
          <div className="relative">
            {content}
            <div className={cn(
              "absolute w-2 h-2 bg-gray-900 border border-gray-700",
              arrowClasses[side]
            )} />
          </div>
        </div>
      )}
    </div>
  );
}
