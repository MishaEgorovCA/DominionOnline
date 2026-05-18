import { useEffect, useState } from "react";
import { BoardCard, cardImageUrl } from "../board/BoardCard.js";
import type { CardView, GameView } from "../../types.js";

const GEM = ["White", "Blue", "Green", "Red", "Brown"] as const;

type Props = {
  game: GameView;
  myName: string;
  validActions: string[];
  send: (msg: object) => void;
};

function sendAction(
  send: Props["send"],
  action: string,
  payload: Record<string, unknown>,
) {
  send({ type: "action", action, payload });
}

export function GameModals({ game, myName, validActions, send }: Props) {
  const me = game.players.find((p) => p.name === myName);
  const isMyTurn = game.currentPlayer === myName && !game.gameOver;

  const [modal, setModal] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [take, setTake] = useState<Record<string, number>>({});
  const [putBack, setPutBack] = useState<Record<string, number>>({});
  const [goldSpend, setGoldSpend] = useState(0);
  const [satchelColor, setSatchelColor] = useState<string>("White");
  const [extraTake, setExtraTake] = useState<string>("");
  const [extraPut, setExtraPut] = useState<string>("");

  useEffect(() => {
    if (!isMyTurn) {
      setModal(null);
      return;
    }
    if (validActions.includes("CHOOSE_NOBLE")) setModal("noble");
    else if (validActions.includes("CHOOSE_CITY")) setModal("city");
    else if (validActions.includes("CHOOSE_SATCHEL_TOKEN")) setModal("satchel");
    else if (validActions.includes("TAKE_EXTRA_TOKEN_AFTER_PURCHASE_POWER"))
      setModal("extraToken");
    else if (validActions.includes("CASCADE_1") || validActions.includes("CASCADE_2"))
      setModal("cascade");
    else if (validActions.includes("RESERVE_NOBLE")) setModal("reserveNoble");
    else if (
      validActions.includes("BUY_CARD") ||
      validActions.includes("TAKE_TOKEN") ||
      validActions.includes("RESERVE_CARD")
    ) {
      if (!modal || modal === "turn") setModal("turn");
    }
  }, [isMyTurn, validActions.join(",")]);

  const boardCards = (): CardView[] => [
    ...game.tier1,
    ...game.tier2,
    ...game.tier3,
    ...game.tier1Orient,
    ...game.tier2Orient,
    ...game.tier3Orient,
  ];

  const close = () => setModal(null);

  if (game.gameOver) {
    return (
      <div className="modal-overlay">
        <div className="modal-panel">
          <h2>Game over</h2>
          <p>Winners: {game.winners.join(", ") || "—"}</p>
        </div>
      </div>
    );
  }

  if (!isMyTurn || !modal) return null;

  return (
  <>
      {modal === "turn" && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Your turn</h2>
            <div className="modal-actions">
              {validActions.includes("TAKE_TOKEN") && (
                <button type="button" onClick={() => setModal("take")}>
                  Take tokens
                </button>
              )}
              {validActions.includes("BUY_CARD") && (
                <button type="button" onClick={() => setModal("buy")}>
                  Buy a card
                </button>
              )}
              {validActions.includes("RESERVE_CARD") && (
                <button type="button" onClick={() => setModal("reserve")}>
                  Reserve a card
                </button>
              )}
              <button type="button" onClick={close}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "take" && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Take tokens</h2>
            <div className="token-pick-grid">
              {GEM.map((g) => (
                <label key={g}>
                  {g}{" "}
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={take[g] ?? 0}
                    onChange={(e) =>
                      setTake((t) => ({ ...t, [g]: Number(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  sendAction(send, "TAKE_TOKEN", {
                    takeTokens: take,
                    putBackTokens: putBack,
                  });
                  setTake({});
                  close();
                }}
              >
                Confirm
              </button>
              <button type="button" onClick={() => setModal("turn")}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "buy" && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Buy card</h2>
            <p className="hint">Click a card on the board, or pick below.</p>
            <div className="card-pick-grid">
              {boardCards().map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={
                    selectedCard === c.id ? "card-pick-btn selected" : "card-pick-btn"
                  }
                  onClick={() => setSelectedCard(c.id)}
                >
                  <img src={cardImageUrl(c)} alt="" />
                </button>
              ))}
              {(me?.reservedCards ?? []).map((c) =>
                "hidden" in c ? null : (
                  <button
                    key={c.id}
                    type="button"
                    className="card-pick-btn"
                    onClick={() => setSelectedCard(c.id)}
                  >
                    <img src={cardImageUrl(c)} alt="" />
                  </button>
                ),
              )}
            </div>
            <label>
              Gold tokens to spend{" "}
              <input
                type="number"
                min={0}
                value={goldSpend}
                onChange={(e) => setGoldSpend(Number(e.target.value))}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                disabled={!selectedCard}
                onClick={() => {
                  if (!selectedCard) return;
                  sendAction(send, "BUY_CARD", {
                    cardId: selectedCard,
                    selectedTokens: { Gold: goldSpend },
                  });
                  setSelectedCard(null);
                  setGoldSpend(0);
                  close();
                }}
              >
                Buy
              </button>
              <button type="button" onClick={() => setModal("turn")}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "reserve" && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Reserve card</h2>
            <div className="card-pick-grid">
              {boardCards().map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="card-pick-btn"
                  onClick={() => {
                    sendAction(send, "RESERVE_CARD", { cardId: c.id });
                    close();
                  }}
                >
                  <img src={cardImageUrl(c)} alt="" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setModal("turn")}>
              Back
            </button>
          </div>
        </div>
      )}

      {modal === "noble" && me && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Choose a noble</h2>
            <div className="card-pick-grid">
              {[...game.nobles, ...(me.reservedNobles ?? [])]
                .filter((c): c is CardView => !("hidden" in c))
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="card-pick-btn"
                    onClick={() => {
                      sendAction(send, "CHOOSE_NOBLE", { cardId: c.id });
                      close();
                    }}
                  >
                    <BoardCard card={c} className="noble-card" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {modal === "city" && me && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Choose a city</h2>
            <div className="card-pick-grid">
              {(me.citiesQualifiedFor ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="card-pick-btn"
                  onClick={() => {
                    sendAction(send, "CHOOSE_CITY", { cityId: c.id });
                    close();
                  }}
                >
                  <BoardCard card={c} className="city-card" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal === "cascade" && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Cascade — take a free card</h2>
            <div className="card-pick-grid">
              {boardCards()
                .filter((c) => {
                  const tier = validActions.includes("CASCADE_1") ? 1 : 2;
                  return c.id.startsWith(String(tier).padStart(2, "0")) || true;
                })
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="card-pick-btn"
                    onClick={() => {
                      sendAction(send, validActions.includes("CASCADE_1") ? "CASCADE_1" : "CASCADE_2", {
                        cardId: c.id,
                      });
                      close();
                    }}
                  >
                    <img src={cardImageUrl(c)} alt="" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {modal === "satchel" && me && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Satchel — choose bonus color</h2>
            <select
              value={satchelColor}
              onChange={(e) => setSatchelColor(e.target.value)}
            >
              {GEM.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const satchel = me.devCards.find((c) => c.tokenType === "Satchel");
                  if (!satchel) return;
                  sendAction(send, "CHOOSE_SATCHEL_TOKEN", {
                    cardId: satchel.id,
                    selected: satchelColor,
                  });
                  close();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "extraToken" && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Trade route — extra token</h2>
            <label>
              Take{" "}
              <select value={extraTake} onChange={(e) => setExtraTake(e.target.value)}>
                <option value="">—</option>
                {[...GEM, "Gold"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Put back{" "}
              <select value={extraPut} onChange={(e) => setExtraPut(e.target.value)}>
                <option value="">—</option>
                {GEM.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  sendAction(send, "TAKE_EXTRA_TOKEN_AFTER_PURCHASE_POWER", {
                    takeToken: extraTake || undefined,
                    putBackToken: extraPut || undefined,
                  });
                  close();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "reserveNoble" && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Reserve a noble</h2>
            <div className="card-pick-grid">
              {game.nobles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="card-pick-btn"
                  onClick={() => {
                    sendAction(send, "RESERVE_NOBLE", { cardId: c.id });
                    close();
                  }}
                >
                  <BoardCard card={c} className="noble-card" />
                </button>
              ))}
            </div>
            <button type="button" onClick={close}>
              Skip
            </button>
          </div>
        </div>
      )}
    </>
  );
}
