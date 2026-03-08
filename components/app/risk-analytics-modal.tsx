"use client";

import { RiskBadge } from "@/components/ui/risk-badge";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Users, Briefcase, Calendar } from "lucide-react";

interface RiskAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    high: number;
    medium: number;
    low: number;
    candidates: Array<{
      id: string;
      name: string;
      jobTitle: string;
      riskLevel: "HIGH" | "MEDIUM" | "LOW";
      score: number;
      flags: number;
      lastEvaluated: string;
    }>;
  };
}

export function RiskAnalyticsModal({ isOpen, onClose, data }: RiskAnalyticsModalProps) {
  const totalCandidates = data.high + data.medium + data.low;
  const highRiskPercentage = totalCandidates > 0 ? (data.high / totalCandidates * 100).toFixed(1) : "0";
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-risk-high-bg/10 border border-risk-high-bg rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-risk-high-bg rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-risk-high" />
            </div>
            <div>
              <p className="text-2xl font-bold text-risk-high">{data.high}</p>
              <p className="text-sm text-risk-high">High Risk</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {highRiskPercentage}% of total candidates
          </p>
        </div>

        <div className="bg-risk-investigate-bg/10 border border-risk-investigate-bg rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-risk-investigate-bg rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-risk-investigate" />
            </div>
            <div>
              <p className="text-2xl font-bold text-risk-investigate">{data.medium}</p>
              <p className="text-sm text-risk-investigate">Medium Risk</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {totalCandidates > 0 ? ((data.medium / totalCandidates) * 100).toFixed(1) : "0"}% of total candidates
          </p>
        </div>

        <div className="bg-risk-safe-bg/10 border border-risk-safe-bg rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-risk-safe-bg rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-risk-safe" />
            </div>
            <div>
              <p className="text-2xl font-bold text-risk-safe">{data.low}</p>
              <p className="text-sm text-risk-safe">Low Risk</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {totalCandidates > 0 ? ((data.low / totalCandidates) * 100).toFixed(1) : "0"}% of total candidates
          </p>
        </div>
      </div>

      {/* Risk Trend */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground font-display mb-4">Risk Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-risk-high" />
            <span className="text-sm text-foreground">High Risk: +2 this week</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-risk-safe" />
            <span className="text-sm text-foreground">Low Risk: -5 this week</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Medium: No change</span>
          </div>
        </div>
      </div>

      {/* Detailed Candidate List */}
      <div>
        <h3 className="text-lg font-semibold text-foreground font-display mb-4">Risk Breakdown by Candidate</h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground font-display">Candidate</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground font-display">Position</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground font-display">Risk Level</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground font-display">Score</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground font-display">Flags</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground font-display">Last Evaluated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{candidate.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{candidate.jobTitle}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge 
                      level={
                        candidate.riskLevel === "HIGH" ? "high" :
                        candidate.riskLevel === "MEDIUM" ? "investigate" :
                        "safe"
                      } 
                      label={candidate.riskLevel} 
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${
                      candidate.riskLevel === "HIGH" ? "text-risk-high" :
                      candidate.riskLevel === "MEDIUM" ? "text-risk-investigate" :
                      "text-risk-safe"
                    }`}>
                      {candidate.score}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{candidate.flags}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{candidate.lastEvaluated}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 font-display mb-3">Recommendations</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Review all high-risk candidates immediately and consider additional screening</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Monitor medium-risk candidates for any changes in their evaluation patterns</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Continue current evaluation process for low-risk candidates</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
