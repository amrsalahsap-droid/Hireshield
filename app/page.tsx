import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ScoreDemo } from "@/components/landing/ScoreDemo";
import { CTA } from "@/components/landing/CTA";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <ScoreDemo />
        <CTA />
      </main>
    </>
  );
}
