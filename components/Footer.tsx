export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface/60 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-sm text-inkmuted sm:flex-row sm:items-center sm:justify-between">
        <p>
          MaskGuard · MobileNetV2 transfer-learning classifier trained on the{' '}
          <span className="text-ink">Kaggle Face Mask Dataset</span>
        </p>
        <p className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          No video is ever recorded or stored
        </p>
      </div>
    </footer>
  );
}
