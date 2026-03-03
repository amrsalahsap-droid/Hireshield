'use client';

import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/shadcn-button';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <main className="min-h-screen w-full bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo 
              src="/hireshield-logo.png" 
              alt="HireShield Logo" 
              className="h-8 w-auto"
              fallback={
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/90 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      <path fill="currentColor" d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"/>
                    </svg>
                  </div>
                  <span className="text-xl font-semibold text-foreground">HireShield</span>
                </div>
              }
            />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' 
              ? 'Sign in to continue to HireShield' 
              : 'Join AI-powered hiring evaluation platform'
            }
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-muted rounded-lg p-1 mb-6">
          <Button
            variant={mode === 'signin' ? 'default' : 'outline'}
            onClick={() => setMode('signin')}
            className="flex-1"
          >
            Sign in
          </Button>
          <Button
            variant={mode === 'signup' ? 'default' : 'outline'}
            onClick={() => setMode('signup')}
            className="flex-1"
          >
            Sign up
          </Button>
        </div>

        {/* Clerk Component */}
        <div className="w-full">
          {mode === 'signin' ? (
            <SignIn 
              redirectUrl="/app"
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "w-full flex justify-center items-center py-3 px-4 border border-input rounded-button text-sm font-medium bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring h-11",
                  formButtonPrimary: "w-full flex justify-center py-3 px-4 border border-transparent rounded-button text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring h-11",
                  formFieldInput: "appearance-none block w-full px-3 py-3 border border-input rounded-button placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm h-11",
                  dividerText: "text-muted-foreground text-sm",
                  footerActionLink: "text-primary hover:text-primary/90 text-sm font-medium",
                  identityPreviewText: "text-foreground text-sm font-medium",
                  formFieldLabel: "text-foreground text-sm font-medium mb-1.5",
                  formFieldError: "text-destructive text-xs mt-1",
                  formResendCodeLink: "text-primary hover:text-primary/90 text-sm font-medium",
                  formSuccessText: "text-safe text-sm"
                }
              }}
            />
          ) : (
            <SignUp 
              redirectUrl="/app"
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "w-full flex justify-center items-center py-3 px-4 border border-input rounded-button text-sm font-medium bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring h-11",
                  formButtonPrimary: "w-full flex justify-center py-3 px-4 border border-transparent rounded-button text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring h-11",
                  formFieldInput: "appearance-none block w-full px-3 py-3 border border-input rounded-button placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm h-11",
                  dividerText: "text-muted-foreground text-sm",
                  footerActionLink: "text-primary hover:text-primary/90 text-sm font-medium",
                  identityPreviewText: "text-foreground text-sm font-medium",
                  formFieldLabel: "text-foreground text-sm font-medium mb-1.5",
                  formFieldError: "text-destructive text-xs mt-1",
                  formResendCodeLink: "text-primary hover:text-primary/90 text-sm font-medium",
                  formSuccessText: "text-safe text-sm"
                }
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
