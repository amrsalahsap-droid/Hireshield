"use client";

import { motion } from "framer-motion";

const scoreBreakdown = [
  { label: "Skill Match", weight: 40, value: 85 },
  { label: "Behavioral Consistency", weight: 20, value: 72 },
  { label: "Risk Flags", weight: 20, value: 91 },
  { label: "Cultural Fit", weight: 10, value: 68 },
  { label: "Communication Clarity", weight: 10, value: 78 },
];

const overallScore = 82;

const getScoreColor = (score: number) => {
  if (score >= 70) return "bg-safe";
  if (score >= 40) return "bg-investigate";
  return "bg-risk";
};

const getScoreLabel = (score: number) => {
  if (score >= 70) return { text: "Safe to Hire", colorClass: "text-safe" };
  if (score >= 40)
    return { text: "Investigate Further", colorClass: "text-investigate" };
  return { text: "High Risk", colorClass: "text-risk" };
};

export function ScoreDemo() {
  const label = getScoreLabel(overallScore);

  return (
    <section id="scoring" className="py-24 relative">
      <div className="absolute inset-0 bg-primary/[0.02]" />
      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-4">
            The HireShield Score
          </h2>
          <p className="text-muted-foreground font-body text-lg max-w-lg mx-auto">
            A transparent 0–100 composite score with full breakdown visibility.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto bg-card rounded-2xl shadow-card border border-border p-8 md:p-12"
        >
          {/* Score circle */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative w-36 h-36 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="hsl(var(--safe))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  whileInView={{
                    strokeDashoffset:
                      2 * Math.PI * 52 * (1 - overallScore / 100),
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold font-display text-foreground">
                  {overallScore}
                </span>
                <span className="text-xs text-muted-foreground font-body">
                  / 100
                </span>
              </div>
            </div>
            <span
              className={`text-lg font-semibold font-display ${label.colorClass}`}
            >
              {label.text}
            </span>
          </div>

          {/* Breakdown bars */}
          <div className="space-y-5">
            {scoreBreakdown.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium font-body text-foreground">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-body">
                      {item.weight}% weight
                    </span>
                    <span className="text-sm font-semibold font-display text-foreground">
                      {item.value}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${getScoreColor(item.value)}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.value}%` }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.8,
                      delay: 0.1 * i,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-sm font-body">
              <div className="w-3 h-3 rounded-full bg-safe" />
              <span className="text-muted-foreground">Green: Safe (70+)</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-body">
              <div className="w-3 h-3 rounded-full bg-investigate" />
              <span className="text-muted-foreground">
                Yellow: Investigate (40–69)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-body">
              <div className="w-3 h-3 rounded-full bg-risk" />
              <span className="text-muted-foreground">
                Red: High Risk (&lt;40)
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
