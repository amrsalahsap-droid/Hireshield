"use client";

import { motion } from "framer-motion";
import { Upload, Brain, BarChart3, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Job Description",
    description:
      "Paste your JD and get instant feedback on clarity, gaps, and bias markers.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Generate Interview Kit",
    description:
      "Receive tailored questions, scoring rubrics, and red-flag detection prompts.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "Evaluate Responses",
    description:
      "Input candidate transcripts for competency scoring and consistency checks.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Get Risk Report",
    description:
      "Review the HireShield Score with full breakdown and evidence trail.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-4">
            How it works
          </h2>
          <p className="text-muted-foreground font-body text-lg max-w-lg mx-auto">
            From job description to hiring decision in four structured steps.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex gap-6 mb-8 last:mb-0"
            >
              {/* Timeline */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center text-accent-foreground">
                  <step.icon className="w-5 h-5" />
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px h-full bg-border mt-2 min-h-[2rem]" />
                )}
              </div>

              {/* Content */}
              <div className="pb-8">
                <span className="text-xs font-mono text-accent font-semibold mb-1 block">
                  STEP {step.step}
                </span>
                <h3 className="text-lg font-semibold font-display text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
