// File: app/components/Progress.tsx
// Issue 7: narrate the ~simulation wait — three protocol nodes light in sequence so the dryRun
// latency reads as value ("we're simulating across all three protocols"), not dead time.
export function Progress() {
  return (
    <div className="progress" role="status" aria-live="polite">
      <span className="p-node n1" />
      <span className="p-node n2" />
      <span className="p-node n3" />
      <span className="p-label">Simulating across DeepBook · Navi · Suilend…</span>
    </div>
  );
}
