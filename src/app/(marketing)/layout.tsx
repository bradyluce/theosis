import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";

// Shell for the public marketing surface: the landing page plus the Privacy and
// Terms pages. `marketing-surface` (globals.css) rebinds the palette variables
// to the mobile app's warmer "candlelit" values, so every color utility inside
// here resolves warm without affecting the web reader under (shell). A shared
// header/footer give the legal pages the same chrome as the landing — no edits
// to their copy required.

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-surface min-h-dvh bg-background text-ink antialiased">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
