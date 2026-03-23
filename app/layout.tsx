import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";

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
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || undefined;

  const bodyClass = `${inter.variable} ${spaceGrotesk.variable} font-body antialiased`;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={bodyClass} suppressHydrationWarning>
        <RootProviders clerkPublishableKey={clerkPublishableKey}>
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
