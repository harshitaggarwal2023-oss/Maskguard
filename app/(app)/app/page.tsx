import HeroSpotlight from '@/components/HeroSpotlight';
import { HowItWorksSection, LivePreviewSection, CtaSection } from '@/components/LandingSections';

/**
 * Landing page composition.
 *
 * The previous Three.js + Theatre.js `ScrollStory` ambient-motion system has
 * been retired in favor of `GradientMesh` on each section — same
 * "ambient color/motion" job at a fraction of the runtime cost, and
 * consistent across the site (about page uses the same primitive). The
 * ScrollStory + ThreeBackground components are kept in `components/` in
 * case a future page wants that specific WebGL treatment back.
 */
export default function HomePage() {
  return (
    <>
      <HeroSpotlight />
      <HowItWorksSection />
      <LivePreviewSection />
      <CtaSection />
    </>
  );
}
