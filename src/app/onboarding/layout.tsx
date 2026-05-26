// Onboarding lives OUTSIDE the (shell) layout — no bottom nav, no side
// rail, no profile masthead. Just the centered card flow.

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
