import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";

export const dynamic = 'force-dynamic';

function SignInComponent() {
  try {
    return (
      <SignIn 
        redirectUrl="/app"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none border-0 p-0",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton: "w-full flex justify-center items-center py-3 px-4 border border-neutral-300 rounded-button text-body font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
            formButtonPrimary: "w-full flex justify-center py-3 px-4 border border-transparent rounded-button text-body font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
            formFieldInput: "appearance-none block w-full px-3 py-2 border border-neutral-300 rounded-button placeholder-neutral-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-body",
            dividerText: "text-neutral-500 text-body",
            footerActionLink: "text-primary-600 hover:text-primary-500 text-body font-medium"
          }
        }}
      />
    );
  } catch (error) {
    console.error("SignIn component error:", error);
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Authentication service unavailable</p>
        <p className="text-sm text-neutral-600">Please try again later or contact support</p>
      </div>
    );
  }
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-card border border-neutral-200 shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo 
              src="/hireshield-logo.png" 
              alt="HireShield Logo" 
              className="h-10 w-auto"
              fallback={
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      <path fill="white" d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"/>
                    </svg>
                  </div>
                  <span className="text-xl font-semibold text-neutral-900">HireShield</span>
                </div>
              }
            />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
              Welcome back
            </h1>
            <p className="text-body text-neutral-600">
              Sign in to continue to HireShield
            </p>
          </div>

          {/* Clerk SignIn Component */}
          <div className="mb-6">
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            }>
              <SignInComponent />
            </Suspense>
          </div>

          {/* Footer Links */}
          <div className="text-center pt-4 border-t border-neutral-200">
            <div className="flex justify-center space-x-4 text-body">
              <a href="/signup" className="text-primary-600 hover:text-primary-500 font-medium">
                Create account
              </a>
              <span className="text-neutral-300">•</span>
              <a href="/forgot-password" className="text-primary-600 hover:text-primary-500 font-medium">
                Forgot password
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
