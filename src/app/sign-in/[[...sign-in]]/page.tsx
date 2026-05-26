import { SignIn } from "@clerk/nextjs";

// Clerk's hosted SignIn component handles all four sign-in methods (Apple
// on iOS web, Google, email+password, magic link) — they're enabled per
// instance in the Clerk dashboard, not here.

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <SignIn signUpUrl="/sign-up" />
    </div>
  );
}
