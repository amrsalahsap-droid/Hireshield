import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4 text-foreground">HireShield</h1>
        <p className="text-lg text-muted-foreground mb-8">
          AI-powered hiring evaluation platform
        </p>
        
        <div className="space-y-4">
          <Link
            href="/auth"
          >
            <Button size="lg" className="w-full">
              Get Started
            </Button>
          </Link>
        </div>
        
        <p className="text-sm text-muted-foreground mt-8">
          Join thousands of companies using AI to streamline their hiring process
        </p>
        
        <div className="mt-4 text-xs text-muted-foreground">
          v2.0
        </div>
      </div>
    </div>
  );
}
