import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign up for HireShield
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start evaluating candidates with AI-powered insights
          </p>
        </div>
        <div className="mt-8">
          <SignUp 
            redirectUrl="/app"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg"
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
