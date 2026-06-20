// File: app/components/Progress.tsx
// Narrate the dryRun wait: three protocol nodes pulse in sequence so the latency reads as work
// ("we are simulating across all three protocols"), not dead time.
export function Progress() {
  return (
    <div className="progress" role="status" aria-live="polite">
      <span className="p-node n1" />
      <span className="p-node n2" />
      <span className="p-node n3" />
      <span className="p-label">Simulating across DeepBook, Navi and Suilend</span>
    </div>
  );
}
