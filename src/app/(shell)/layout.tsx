import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGuard } from "@/components/layout/onboarding-guard";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OnboardingGuard />
      <AppShell>{children}</AppShell>
    </>
  );
}
