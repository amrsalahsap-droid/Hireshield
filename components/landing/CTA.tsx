"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="gradient-hero rounded-2xl p-12 md:p-20 text-center relative overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/10 blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-accent/5 blur-[60px]" />

          <div className="relative z-10">
            <Shield className="w-12 h-12 text-accent mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold font-display text-primary-foreground mb-4">
              Hire with confidence
            </h2>
            <p className="text-primary-foreground/70 font-body text-lg max-w-md mx-auto mb-8">
              Start analyzing your first job description for free. No credit
              card required.
            </p>
            <Button
              variant="hero"
              size="lg"
              className="text-base px-10 py-6"
              asChild
            >
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground font-body mt-8 max-w-lg mx-auto">
          HireShield provides structured analysis. Final hiring decisions remain
          with the employer. HireShield does not auto-reject candidates or use
          protected attributes.
        </p>
      </div>
    </section>
  );
}
