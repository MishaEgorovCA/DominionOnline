import { useEffect, useRef } from "react";
import type { CardFlight } from "../hooks/useViewDiffFlight.js";

type Props = {
  flight: CardFlight | null;
  onComplete: () => void;
  duration?: number;
};

/**
 * Renders a one-off full-screen float between two rects (best-effort).
 */
export function CardFlightLayer({ flight, onComplete, duration = 420 }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!flight) return;
    const node = elRef.current;
    if (!node) return;
    const from = flight.from;
    const to = flight.to;
    const ax = to.left + to.width / 2 - (from.left + from.width / 2);
    const ay = to.top + to.height / 2 - (from.top + from.height / 2);
    const scale = to.width / Math.max(from.width, 1);
    const anim = node.animate(
      [
        {
          transform: "translate(0,0) scale(1)",
          opacity: 0.95,
        },
        {
          transform: `translate(${ax}px, ${ay}px) scale(${Math.min(1.15, scale)})`,
          opacity: 1,
        },
      ],
      { duration, easing: "cubic-bezier(0.2,0.6,0.2,1)", fill: "forwards" },
    );
    anim.onfinish = () => onComplete();
    return () => {
      anim.cancel();
    };
  }, [flight, onComplete, duration]);

  if (!flight) return null;
  return (
    <div
      ref={elRef}
      className="card-flight"
      style={{
        position: "fixed",
        left: flight.from.left,
        top: flight.from.top,
        width: flight.from.width,
        height: flight.from.height,
        zIndex: 20000,
        pointerEvents: "none",
      }}
    >
      <img
        className="card-flight__img"
        src={flight.src}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 6,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}
