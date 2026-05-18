import { useState } from "react";
import type { CardView, GameView } from "../types.js";

const GEMS = ["White", "Blue", "Green", "Red", "Brown"] as const;

type Props = {
  game: GameView;
  myName: string;
  validActions: string[];
  send: (msg: object) => void;
};

function CardList({
  title,
  cards,
  onPick,
}: {
  title: string;
  cards: CardView[];
  onPick?: (id: string) => void;
}) {
  if (!cards.length) return null;
  return (
    <div className="card-row">
      <h3>{title}</h3>
      <div className="card-grid">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            className="card-btn"
            disabled={!onPick}
            onClick={() => onPick?.(c.id)}
          >
            <span className="card-id">{c.id}</span>
            <span>{c.prestigePoints} pts</span>
            {c.tokenType && <span>{c.tokenType} +{c.bonus}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GameScreen({ game, myName, validActions, send }: Props) {
  const me = game.players.find((p) => p.name === myName);
  const [takeW, setTakeW] = useState(0);
  const [takeB, setTakeB] = useState(0);
  const [takeG, setTakeG] = useState(0);
  const [takeR, setTakeR] = useState(0);
  const [takeBr, setTakeBr] = useState(0);
  const [buyId, setBuyId] = useState("");
  const [buyGold, setBuyGold] = useState(0);
  const [nobleId, setNobleId] = useState("");

  const isMyTurn = game.currentPlayer === myName;

  const doTakeTokens = () => {
    send({
      type: "action",
      action: "TAKE_TOKEN",
      payload: {
        takeTokens: {
          White: takeW,
          Blue: takeB,
          Green: takeG,
          Red: takeR,
          Brown: takeBr,
        },
        putBackTokens: {},
      },
    });
  };

  const doBuy = () => {
    if (!buyId) return;
    send({
      type: "action",
      action: "BUY_CARD",
      payload: {
        cardId: buyId,
        selectedTokens: { Gold: buyGold },
      },
    });
  };

  const doReserve = (id: string) => {
    send({
      type: "action",
      action: "RESERVE_CARD",
      payload: { cardId: id },
    });
  };

  const doChooseNoble = () => {
    if (!nobleId) return;
    send({
      type: "action",
      action: "CHOOSE_NOBLE",
      payload: { cardId: nobleId },
    });
  };

  return (
    <div className="game">
      <p className="turn">
        {game.gameOver
          ? `Game over — winners: ${game.winners.join(", ") || "?"}`
          : isMyTurn
            ? "Your turn"
            : `Waiting for ${game.currentPlayer ?? "…"}`}
      </p>
      <p className="hint">Valid: {validActions.join(", ") || "—"}</p>

      <div className="tokens">
        <h3>Bank</h3>
        {GEMS.map((g) => (
          <span key={g} className="chip">
            {g}: {game.tokens[g] ?? 0}
          </span>
        ))}
        <span className="chip">Gold: {game.tokens.Gold ?? 0}</span>
      </div>

      {me && (
        <div className="me-panel">
          <h3>You ({me.prestigePoints} pts)</h3>
          <p>
            Gems:{" "}
            {GEMS.map((g) => `${g}:${me.tokens[g] ?? 0}`).join(" ")} · Gold:{" "}
            {me.tokens.Gold ?? 0}
          </p>
          <p>
            Bonuses:{" "}
            {GEMS.map((g) => `${g}:${me.bonuses[g] ?? 0}`).join(" ")}
          </p>
        </div>
      )}

      <CardList title="Tier 1" cards={game.tier1} onPick={isMyTurn ? setBuyId : undefined} />
      <CardList title="Tier 2" cards={game.tier2} onPick={isMyTurn ? setBuyId : undefined} />
      <CardList title="Tier 3" cards={game.tier3} onPick={isMyTurn ? setBuyId : undefined} />
      <CardList title="Orient 1" cards={game.tier1Orient} onPick={isMyTurn ? setBuyId : undefined} />
      <CardList title="Orient 2" cards={game.tier2Orient} onPick={isMyTurn ? setBuyId : undefined} />
      <CardList title="Orient 3" cards={game.tier3Orient} onPick={isMyTurn ? setBuyId : undefined} />
      <CardList title="Nobles" cards={game.nobles} onPick={isMyTurn ? setNobleId : undefined} />

      {isMyTurn && validActions.includes("TAKE_TOKEN") && (
        <section className="action-panel">
          <h3>Take tokens</h3>
          <div className="token-picks">
            {GEMS.map((g, i) => {
              const state = [takeW, takeB, takeG, takeR, takeBr][i]!;
              const setters = [setTakeW, setTakeB, setTakeG, setTakeR, setTakeBr];
              return (
                <label key={g}>
                  {g}{" "}
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={state}
                    onChange={(e) => setters[i]!(Number(e.target.value))}
                  />
                </label>
              );
            })}
          </div>
          <button type="button" onClick={doTakeTokens}>
            Take
          </button>
        </section>
      )}

      {isMyTurn && validActions.includes("BUY_CARD") && (
        <section className="action-panel">
          <h3>Buy card</h3>
          <input
            value={buyId}
            onChange={(e) => setBuyId(e.target.value)}
            placeholder="Card id"
          />
          <label>
            Gold to spend{" "}
            <input
              type="number"
              min={0}
              value={buyGold}
              onChange={(e) => setBuyGold(Number(e.target.value))}
            />
          </label>
          <button type="button" onClick={doBuy}>
            Buy
          </button>
        </section>
      )}

      {isMyTurn && validActions.includes("RESERVE_CARD") && buyId && (
        <button type="button" onClick={() => doReserve(buyId)}>
          Reserve selected card
        </button>
      )}

      {isMyTurn && validActions.includes("CHOOSE_NOBLE") && (
        <section className="action-panel">
          <h3>Choose noble</h3>
          <input
            value={nobleId}
            onChange={(e) => setNobleId(e.target.value)}
            placeholder="Noble id"
          />
          <button type="button" onClick={doChooseNoble}>
            Take noble
          </button>
        </section>
      )}

      {isMyTurn &&
        (validActions.includes("CASCADE_1") ||
          validActions.includes("CASCADE_2")) &&
        buyId && (
          <button
            type="button"
            onClick={() =>
              send({
                type: "action",
                action: validActions.includes("CASCADE_1")
                  ? "CASCADE_1"
                  : "CASCADE_2",
                payload: { cardId: buyId },
              })
            }
          >
            Cascade: take {buyId}
          </button>
        )}
    </div>
  );
}
