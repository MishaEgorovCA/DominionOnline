import { BoardCard } from "./BoardCard.js";
import type { CardView, DeckView } from "../../types.js";

const base = import.meta.env.BASE_URL;

type Props = {
  level: 1 | 2 | 3;
  devDeck: DeckView | undefined;
  orientDeck: DeckView | undefined;
  devCards: CardView[];
  orientCards: CardView[];
  onCardClick?: (id: string) => void;
};

const DECK_IMG = [
  `${base}images/BlueCard.jpg`,
  `${base}images/YellowCard.jpg`,
  `${base}images/GreenCard.jpg`,
] as const;

function EmptySlot({ className }: { className: string }) {
  return (
    <div className={className}>
      <img alt="" />
    </div>
  );
}

export function TierRow({
  level,
  devDeck,
  orientDeck,
  devCards,
  orientCards,
  onCardClick,
}: Props) {
  const rowClass = `board-cards-row board-cards-level${level}`;

  return (
    <div className={rowClass}>
      <div
        className="board-cards-dev-deck"
        {...(devDeck?.canDraw === false ? { "data-empty": "true" } : {})}
      >
        <img src={DECK_IMG[level - 1]} alt="" />
      </div>
      <div className="board-cards-dev-selectable">
        {Array.from({ length: 4 }, (_, i) => {
          const card = devCards[i];
          if (card) {
            return (
              <BoardCard
                key={card.id}
                card={card}
                onClick={onCardClick ? () => onCardClick(card.id) : undefined}
              />
            );
          }
          return <EmptySlot key={`ed-${i}`} className="board-card-dev" />;
        })}
      </div>
      <div
        className="board-cards-dev-deck board-cards-dev-deck-orient"
        {...(orientDeck?.canDraw === false ? { "data-empty": "true" } : {})}
      >
        <img src={`${base}images/RedCardOne.jpg`} alt="" />
      </div>
      <div className="board-cards-dev-selectable board-cards-dev-selectable-orient">
        {Array.from({ length: 2 }, (_, i) => {
          const card = orientCards[i];
          if (card) {
            return (
              <BoardCard
                key={card.id}
                card={card}
                className="board-card-dev board-card-dev-orient"
                onClick={onCardClick ? () => onCardClick(card.id) : undefined}
              />
            );
          }
          return (
            <EmptySlot
              key={`eo-${i}`}
              className="board-card-dev board-card-dev-orient"
            />
          );
        })}
      </div>
    </div>
  );
}
