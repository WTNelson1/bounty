/**
 * The chain link, drawn rather than borrowed.
 *
 * Every emoji chain (🔗, ⛓) either renders in colour or, forced to text
 * presentation, garbles in whatever fallback font catches it — and none of
 * them inherit `currentColor`, so they sit grey while the row around them
 * takes the ember ink and the copper hover. Two overlapping pills on a 45°
 * makes the same mark in one hairline stroke that follows the palette for
 * free.
 *
 * This is not an icon library — it is one shape, in the same stroke idiom as
 * the app icon.
 */
export default function LinkGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="link-glyph"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-45 12 12)">
        <rect x="2.5" y="8.5" width="12" height="7" rx="3.5" />
        <rect x="9.5" y="8.5" width="12" height="7" rx="3.5" />
      </g>
    </svg>
  )
}
