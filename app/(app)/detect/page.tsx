import WebcamFeed from '@/components/WebcamFeed';

export default function DetectPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-8 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-accent-deep">
          Live detection
        </span>
        <h1 className="mt-2 font-display text-4xl text-ink">Watch it work, live</h1>
        <p className="mx-auto mt-3 max-w-md text-inkmuted">
          Grant camera access below. Each frame is analyzed and immediately discarded — nothing
          about your video is ever recorded or stored.
        </p>
      </div>
      <WebcamFeed />
    </section>
  );
}
