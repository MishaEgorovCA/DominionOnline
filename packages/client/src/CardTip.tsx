import type { ReactNode } from "react";
import { formatCardTooltip } from "@dominion/engine";

type Props = {
  cardId: string;
  children: ReactNode;
  as?: "span" | "button";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

/** Hover/focus tooltip plus native title for touch and screen readers. */
export function CardTip({
  cardId,
  children,
  as = "span",
  className = "",
  onClick,
  disabled,
  type = "button",
}: Props) {
  const text = formatCardTooltip(cardId);
  const tip = (
    <span className="card-tip-popup" role="tooltip">
      {text}
    </span>
  );

  if (as === "button") {
    return (
      <button
        type={type}
        className={`card-tip-wrap ${className}`.trim()}
        title={text}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
        {tip}
      </button>
    );
  }

  return (
    <span className={`card-tip-wrap ${className}`.trim()} title={text}>
      {children}
      {tip}
    </span>
  );
}
