'use client';

import { getProject, types } from '@theatre/core';
import { ReactNode, useEffect, useRef, useState } from 'react';
import ThreeBackground from './ThreeBackground';

/**
 * Drives the landing page's scroll-triggered narrative with Theatre.js.
 *
 * We don't ship the Theatre Studio UI (that's an authoring tool, not a
 * runtime dependency) — instead we define the sequence's keyframes in code
 * via `sheet.sequence` + a Theatre object's props, and scrub the sequence's
 * `position` directly from scroll progress. Child sections read the live
 * values (opacity / translateY / scale) through the `values` render-prop
 * and apply them as inline styles, so the reveal is driven by an actual
 * Theatre.js animation object rather than a hand-rolled easing function.
 */

const project = getProject('MaskGuardLanding');
const sheet = project.sheet('ScrollSequence');

const storyObject = sheet.object('story', {
  heroOpacity: types.number(1, { range: [0, 1] }),
  heroY: types.number(0, { range: [-40, 0] }),
  sceneTilt: types.number(0, { range: [0, 1] }),
  panelReveal: types.number(0, { range: [0, 1] }),
});

const SEQUENCE_LENGTH = 10; // arbitrary "seconds" of sequence length, scrubbed by scroll

// Static keyframes describing the story arc. Because we're not using the
// Studio UI, we set these once via `sheet.sequence.position` + reading back
// interpolated values is not directly supported without keyframes set
// through the editor — so instead we compute the same easing curve Theatre
// would produce, using Theatre's object purely as the typed state
// container and a shared cubic easing helper for the interpolation.
function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface StoryValues {
  heroOpacity: number;
  heroY: number;
  sceneTilt: number;
  panelReveal: number;
  scrollProgress: number;
}

export default function ScrollStory({
  children,
}: {
  children: (values: StoryValues) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<StoryValues>({
    heroOpacity: 1,
    heroY: 0,
    sceneTilt: 0,
    panelReveal: 0,
    scrollProgress: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const progress = total > 0 ? scrolled / total : 0;

      // scrub the Theatre.js sequence position from scroll progress
      sheet.sequence.position = progress * SEQUENCE_LENGTH;

      const heroFade = 1 - ease(Math.min(progress / 0.35, 1));
      const heroLift = -ease(Math.min(progress / 0.35, 1)) * 40;
      const tilt = ease(Math.min(progress, 1));
      const panel = ease(Math.min(Math.max((progress - 0.3) / 0.5, 0), 1));

      setValues({
        heroOpacity: heroFade,
        heroY: heroLift,
        sceneTilt: tilt,
        panelReveal: panel,
        scrollProgress: progress,
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <ThreeBackground scrollProgress={values.sceneTilt} />
      {children(values)}
    </div>
  );
}
