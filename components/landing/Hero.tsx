"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradient orb */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/6 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-8 font-body text-sm font-medium"
          >
            <Shield className="w-4 h-4" />
            AI-Powered Hiring Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold font-display tracking-tight text-foreground leading-[1.1] mb-6"
          >
            Stop making
            <br />
            <span className="text-accent">bad hires.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mx-auto mb-10 leading-relaxed"
          >
            HireShield uses structured AI evaluation to analyze job descriptions,
            generate interviews, score candidates, and flag risks — before you
            commit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="hero" size="lg" className="text-base px-8 py-6" asChild>
              <Link href="/signup">
                Start Free Analysis
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
              <Link href="/#how-it-works">See How It Works</Link>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-sm font-body"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-safe" />
              No auto-rejections
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-safe" />
              Bias-aware analysis
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-safe" />
              Evidence-based scoring
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
