import { BoardCard } from "./BoardCard.js";
import { TierRow } from "./TierRow.js";
import { TokenChip } from "./TokenChip.js";
import type { CardView, GameView, PlayerView } from "../../types.js";

const GEM = ["Red", "Blue", "Green", "White", "Brown"] as const;

type Props = {
  game: GameView;
  me: PlayerView | undefined;
  onCardClick?: (id: string) => void;
};

function visible(deck?: { visibleCards: CardView[] }): CardView[] {
  return deck?.visibleCards ?? [];
}

export function GameBoard({ game, me, onCardClick }: Props) {
  const nobles = game.nobleDeck?.visibleCards ?? game.nobles;
  const cities = game.cityDeck?.visibleCards ?? [];

  return (
    <div id="game-elements" className="game-elements">
      {me ? (
        <div id="player-inventory" className="player-inventory">
          <div className="player-inventory-container">
            <div className="player-prestige-points-container">
              <span>{me.prestigePoints}</span>
            </div>
            <div className="player-inventory-tokens">
              {GEM.map((g) => (
                <TokenChip
                  key={g}
                  color={g}
                  count={me.tokens[g] ?? 0}
                  bonus={me.bonuses[g] ?? 0}
                />
              ))}
              <TokenChip color="Gold" count={me.tokens.Gold ?? 0} />
            </div>
            <div className="player-inventory-cards">
              <div className="player-inventory-card-drawer">
                {me.devCards.map((c) => (
                  <BoardCard
                    key={c.id}
                    card={c}
                    className="player-inventory-card"
                  />
                ))}
              </div>
            </div>
            <div className="player-inventory-reservedcards">
              {me.reservedCards.map((c) =>
                "hidden" in c ? (
                  <div key={c.id} className="player-inventory-card-reserved card-back" />
                ) : (
                  <BoardCard
                    key={c.id}
                    card={c}
                    className="player-inventory-card-reserved"
                    onClick={onCardClick ? () => onCardClick(c.id) : undefined}
                  />
                ),
              )}
            </div>
            <div className="player-inventory-nobles">
              {(me.nobleCards ?? []).map((c) => (
                <BoardCard key={c.id} card={c} className="noble-card" />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div id="board" className="board board-container">
        <div className="board-tokens">
          {GEM.map((g) => (
            <TokenChip key={g} color={g} count={game.tokens[g] ?? 0} />
          ))}
          <TokenChip color="Gold" count={game.tokens.Gold ?? 0} />
        </div>
        <div className="board-nobles">
          {Array.from({ length: 5 }, (_, i) => {
            const card = nobles[i];
            return card ? (
              <BoardCard
                key={card.id}
                card={card}
                className="noble-card"
                onClick={onCardClick ? () => onCardClick(card.id) : undefined}
              />
            ) : (
              <div key={`n-${i}`} className="noble-card">
                <img alt="" />
              </div>
            );
          })}
        </div>
        {game.gameVersion === "BASE_ORIENT_CITIES" && cities.length > 0 ? (
          <div className="board-cities">
            {cities.map((c) => (
              <BoardCard
                key={c.id}
                card={c}
                className="city-card"
                onClick={onCardClick ? () => onCardClick(c.id) : undefined}
              />
            ))}
          </div>
        ) : null}
        <div className="board-cards">
          <TierRow
            level={3}
            devDeck={game.tier3Deck}
            orientDeck={game.tier3OrientDeck}
            devCards={game.tier3Deck?.visibleCards ?? game.tier3}
            orientCards={game.tier3OrientDeck?.visibleCards ?? game.tier3Orient}
            onCardClick={onCardClick}
          />
          <TierRow
            level={2}
            devDeck={game.tier2Deck}
            orientDeck={game.tier2OrientDeck}
            devCards={game.tier2Deck?.visibleCards ?? game.tier2}
            orientCards={game.tier2OrientDeck?.visibleCards ?? game.tier2Orient}
            onCardClick={onCardClick}
          />
          <TierRow
            level={1}
            devDeck={game.tier1Deck}
            orientDeck={game.tier1OrientDeck}
            devCards={game.tier1Deck?.visibleCards ?? game.tier1}
            orientCards={game.tier1OrientDeck?.visibleCards ?? game.tier1Orient}
            onCardClick={onCardClick}
          />
        </div>
      </div>

      <div className="other-players">
        {game.players
          .filter((p) => p.name !== me?.name)
          .map((p) => (
            <div key={p.name} className="other-player" data-pname={p.name}>
              <div className="other-player-name">{p.name}</div>
              <div className="other-prestige-point-container">
                <span>{p.prestigePoints}</span>
              </div>
              <div className="other-inventory-cards">
                {p.devCards.map((c) => (
                  <BoardCard
                    key={c.id}
                    card={c}
                    className="other-inventory-card"
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
