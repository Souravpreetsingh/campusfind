import Constellation from './constellation';

/**
 * Fixed, pointer-transparent constellation behind every canonical screen.
 * The colors are tuned to the CampusFind cream/papaya palette while keeping
 * the supplied Originkit component and its shader-based links intact.
 */
export default function SiteBackground() {
  return (
    <div className="site-background" aria-hidden="true">
      <Constellation
        dot="#FF4500"
        line="#797770"
        dotHover="#FFBE00"
        lineHover="#FF4500"
        nodes={16}
        reach={14}
        lineWidth={1}
        lineGlow={18}
        dotSize={20}
        drift={10}
        parallax={8}
        cursor={16}
      />
    </div>
  );
}
