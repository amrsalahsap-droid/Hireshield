import React from "react";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

type StatusLevel = "healthy" | "medium-risk" | "high-risk";

interface StatusBadgeProps {
  status: StatusLevel;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const getStatusConfig = (level: StatusLevel) => {
    switch (level) {
      case "healthy":
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: "Healthy",
          bgColor: "bg-green-100",
          textColor: "text-green-700",
          borderColor: "border-green-200",
          description: "Pipeline balanced"
        };
      case "medium-risk":
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          text: "Medium Risk",
          bgColor: "bg-amber-100",
          textColor: "text-amber-700",
          borderColor: "border-amber-200",
          description: "Review required"
        };
      case "high-risk":
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: "High Risk",
          bgColor: "bg-red-100",
          textColor: "text-red-700",
          borderColor: "border-red-200",
          description: "Immediate attention"
        };
      default:
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: "Healthy",
          bgColor: "bg-green-100",
          textColor: "text-green-700",
          borderColor: "border-green-200",
          description: "Pipeline balanced"
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor} ${className}`}>
      <span className={config.textColor}>
        {config.icon}
      </span>
      <span className="text-sm font-semibold font-display">
        {config.text}
      </span>
    </div>
  );
}
