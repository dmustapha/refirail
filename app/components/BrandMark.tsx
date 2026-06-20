// File: app/components/BrandMark.tsx
// The RefiRail logomark: "the Rail" glyph. An origin station (hollow), a rail line, and a settled
// destination node (mint). Reads down to favicon size. Used in place of the plain brand dot.
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 16) / 30}
      viewBox="0 0 30 16"
      fill="none"
      role="img"
      aria-label="RefiRail"
      style={{ flex: "none" }}
    >
      <line x1="4" y1="8" x2="26" y2="8" stroke="#4DA2FF" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="4" cy="8" r="3" fill="#060A12" stroke="#4DA2FF" strokeWidth="2" />
      <circle cx="26" cy="8" r="3.6" fill="#46E5B5" />
    </svg>
  );
}
