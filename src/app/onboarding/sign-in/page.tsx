"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function SignInStepPage() {
  const router = useRouter();
  const commit = useOnboardingState((s) => s.commit);

  function finish() {
    commit();
    router.push("/home");
  }

  return (
    <OnboardingShell
      step="sign-in"
      title="Save your progress?"
      subtitle="Sign in to keep your highlights, notes, and reading list across devices. Or continue as a guest — you can sign in any time."
    >
      <SignedOut>
        <div className="space-y-3">
          <SignInButton mode="modal">
            <button className="w-full rounded-2xl bg-accent px-5 py-4 text-center font-serif text-base font-medium text-background transition-opacity duration-200 hover:opacity-90">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="w-full rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4 text-center font-serif text-base text-accent transition-colors duration-200 hover:bg-accent hover:text-background">
              Create an account
            </button>
          </SignUpButton>
          <button
            type="button"
            onClick={finish}
            className="w-full rounded-2xl border border-line/40 px-5 py-4 text-center text-sm text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            Continue as guest
          </button>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="space-y-3 rounded-2xl border border-accent/30 bg-accent-soft px-5 py-5 text-center">
          <p className="font-serif text-base text-accent">
            ✓ Signed in. Your progress will sync.
          </p>
          <button
            type="button"
            onClick={finish}
            className="w-full rounded-full bg-accent px-5 py-3 text-center font-serif text-base font-medium text-background transition-opacity duration-200 hover:opacity-90"
          >
            Enter the app
          </button>
        </div>
      </SignedIn>
    </OnboardingShell>
  );
}
