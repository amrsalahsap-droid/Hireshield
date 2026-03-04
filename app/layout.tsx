import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { clerkAppearance } from "@/lib/clerk-appearance";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HireShield",
  description: "AI-powered hiring evaluation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only use ClerkProvider if environment variables are available
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  if (!clerkPublishableKey) {
    // Fallback for build time without Clerk keys
    return (
      <html lang="en">
        <body
          className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}
        >
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4 text-foreground">HireShield</h1>
              <p className="text-lg text-muted-foreground mb-8">
                AI-powered hiring evaluation platform
              </p>
              <div className="text-sm text-muted-foreground">
                Please configure Clerk environment variables to enable authentication
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body
          className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}
        >
          {children}
          <Toaster richColors position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
