// src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="h-10 w-10 rounded-xl bg-[#0A2810] flex items-center justify-center">
              <span className="text-[#D4A843] font-bold text-lg">I</span>
            </div>
            <span className="font-bold text-2xl text-[#0A2810] tracking-tight">Invitely</span>
          </div>
          <p className="text-stone-500 text-sm">Create your account and start sending invitations</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              card: "shadow-xl border border-stone-200 rounded-2xl",
              headerTitle: "text-[#0A2810]",
              formButtonPrimary: "bg-[#0A2810] hover:bg-[#0f3515]",
            },
          }}
        />
      </div>
    </div>
  );
}
