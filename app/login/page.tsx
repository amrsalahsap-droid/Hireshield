import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Panel - Brand & Value */}
      <div className="lg:w-2/5 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-12 flex flex-col justify-between">
        {/* Top Section */}
        <div>
          {/* Logo Section */}
          <div className="mb-8 flex items-center space-x-3">
            {/* HireShield Logo - Replace with your actual logo file */}
            <img 
              src="/hireshield-logo.png" 
              alt="HireShield Logo" 
              className="h-12 w-auto"
              onError={(e) => {
                // Fallback to SVG if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback SVG logo */}
            <div className="hidden items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  <path fill="white" d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">HireShield</h1>
                <p className="text-slate-300 text-sm uppercase tracking-wide">STRUCTURED HIRING. REDUCED RISK.</p>
              </div>
            </div>
          </div>

          {/* Subtle blue glowing line under tagline */}
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mb-8"></div>

          {/* Value Bullets */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-slate-200">Evidence-based evaluation</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-slate-200">Structured interview intelligence</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-slate-200">Bias-aware risk detection</span>
            </div>
          </div>

          {/* Subtle UI Preview */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
            <div className="text-xs text-slate-400 mb-2">Preview</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Score</span>
                <span className="text-sm font-semibold text-green-400">82</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Risk</span>
                <span className="text-sm font-semibold text-yellow-400">Medium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Footer */}
        <div className="space-y-2 text-xs text-slate-400">
          <p>• AI does not evaluate protected attributes</p>
          <p>• Your data is private and never used to train models</p>
          <p>• SOC2-ready architecture</p>
        </div>
      </div>

      {/* Right Panel - Login Card */}
      <div className="lg:w-3/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-gray-600">Sign in to continue to HireShield</p>
            </div>

            {/* Clerk SignIn Component */}
            <div className="mb-6">
              <SignIn 
                redirectUrl="/app"
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "shadow-none border-0 p-0",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton: "w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                    formButtonPrimary: "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                    formFieldInput: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                    dividerText: "text-gray-500 text-sm",
                    footerActionLink: "text-blue-600 hover:text-blue-500 text-sm font-medium"
                  }
                }}
              />
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our Terms and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
