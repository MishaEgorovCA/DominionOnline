import { cityCardImg, devCardImg, nobleCardImg } from "../../cardArt.js";
import type { CardView } from "../../types.js";

type Props = {
  card: CardView;
  className?: string;
  onClick?: () => void;
  hidden?: boolean;
};

export function cardImageUrl(card: CardView): string {
  if (card.kind === "city") return cityCardImg(card.id);
  if (card.kind === "noble") return nobleCardImg(card.id);
  return devCardImg(card.id);
}

export function BoardCard({ card, className = "board-card-dev", onClick, hidden }: Props) {
  if (hidden || "hidden" in card) {
    return (
      <div className={`${className} board-card--hidden`} data-card-id={card.id}>
        <div className="card-back" />
      </div>
    );
  }
  const inner = (
    <>
      <img src={cardImageUrl(card)} alt="" draggable={false} />
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        data-card-id={card.id}
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={className} data-card-id={card.id}>
      {inner}
    </div>
  );
}

