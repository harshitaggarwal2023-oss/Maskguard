import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

/**
 * Layout for the real MaskGuard app (the "(app)" route group).
 *
 * This is the chrome that used to live in the global root layout: the floating
 * pill Nav and the Footer. It wraps every app route — "/app" (HeroSpotlight
 * home), "/detect", "/insights", "/about" — but deliberately NOT the "/"
 * landing page, which has its own self-contained chrome.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
