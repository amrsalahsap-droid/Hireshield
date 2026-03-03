'use client';

import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';
import { Logo } from '@/components/ui/logo';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <main className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo 
              src="/hireshield-logo.png" 
              alt="HireShield Logo" 
              className="h-8 w-auto"
              fallback={
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      <path fill="white" d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"/>
                    </svg>
                  </div>
                  <span className="text-xl font-semibold text-neutral-900">HireShield</span>
                </div>
              }
            />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-slate-600">
            {mode === 'signin' 
              ? 'Sign in to continue to HireShield' 
              : 'Join the AI-powered hiring evaluation platform'
            }
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign up
          </button>
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
                  socialButtonsBlockButton: "w-full flex justify-center items-center py-3 px-4 border border-slate-300 rounded-button text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 h-11",
                  formButtonPrimary: "w-full flex justify-center py-3 px-4 border border-transparent rounded-button text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 h-11",
                  formFieldInput: "appearance-none block w-full px-3 py-3 border border-slate-300 rounded-button placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm h-11",
                  dividerText: "text-slate-500 text-sm",
                  footerActionLink: "text-primary-600 hover:text-primary-500 text-sm font-medium",
                  identityPreviewText: "text-slate-900 text-sm font-medium",
                  formFieldLabel: "text-slate-700 text-sm font-medium mb-1.5",
                  formFieldError: "text-red-500 text-xs mt-1",
                  formResendCodeLink: "text-primary-600 hover:text-primary-500 text-sm font-medium",
                  formSuccessText: "text-green-600 text-sm"
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
                  socialButtonsBlockButton: "w-full flex justify-center items-center py-3 px-4 border border-slate-300 rounded-button text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 h-11",
                  formButtonPrimary: "w-full flex justify-center py-3 px-4 border border-transparent rounded-button text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 h-11",
                  formFieldInput: "appearance-none block w-full px-3 py-3 border border-slate-300 rounded-button placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm h-11",
                  dividerText: "text-slate-500 text-sm",
                  footerActionLink: "text-primary-600 hover:text-primary-500 text-sm font-medium",
                  identityPreviewText: "text-slate-900 text-sm font-medium",
                  formFieldLabel: "text-slate-700 text-sm font-medium mb-1.5",
                  formFieldError: "text-red-500 text-xs mt-1",
                  formResendCodeLink: "text-primary-600 hover:text-primary-500 text-sm font-medium",
                  formSuccessText: "text-green-600 text-sm"
                }
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
