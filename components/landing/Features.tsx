"use client";

import { motion } from "framer-motion";
import {
  FileSearch,
  MessageSquareText,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "JD Analyzer",
    description:
      "Detects skill gaps, vague language, unrealistic expectations, and seniority mismatches in your job descriptions.",
    tag: "Input: Job Description",
  },
  {
    icon: MessageSquareText,
    title: "Interview Generator",
    description:
      "Creates behavioral, technical, and scenario-based questions with a 1–5 scoring rubric tailored to your role.",
    tag: "Output: Structured Interview",
  },
  {
    icon: UserCheck,
    title: "Response Evaluator",
    description:
      "Scores candidate answers for competency, confidence, consistency, and flags missing evidence markers.",
    tag: "Input: Transcript",
  },
  {
    icon: ShieldAlert,
    title: "Risk Scoring Engine",
    description:
      "Generates a 0–100 HireShield Score across skill match, behavioral consistency, risk flags, and culture fit.",
    tag: "Output: Risk Report",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-4">
            Four layers of protection
          </h2>
          <p className="text-muted-foreground font-body text-lg max-w-lg mx-auto">
            Every hiring decision passes through our structured evaluation
            pipeline.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative bg-card rounded-xl p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-border"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-accent/10 text-accent shrink-0">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-block text-xs font-medium font-body text-muted-foreground bg-muted px-2 py-1 rounded-md mb-3">
                    {feature.tag}
                  </span>
                  <h3 className="text-xl font-semibold font-display text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
