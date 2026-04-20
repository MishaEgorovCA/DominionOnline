import type { Dispatch, SetStateAction } from "react";
import type { Command } from "@dominion/engine";
import { CardTip } from "../CardTip.js";
import { cardLabel } from "../cardUtil.js";
import type { GameView } from "../types.js";

type Pending = { kind: string; player?: string } | null;

type Props = {
  game: GameView;
  you: string;
  send: (msg: object) => void;
  sendCmd: (c: Command) => void;
  hand: string[];
  selected: number[];
  toggleSel: (i: number) => void;
  setSelected: Dispatch<SetStateAction<number[]>>;
  rawCmd: string;
  setRawCmd: (s: string) => void;
  setErr: (e: string | null) => void;
};

export function GameScreen({
  game,
  you,
  send,
  sendCmd,
  hand,
  selected,
  toggleSel,
  setSelected,
  rawCmd,
  setRawCmd,
  setErr,
}: Props) {
  const activePid = game.playerOrder[game.whoseTurn] ?? null;
  const isYourTurn = activePid === you;
  const pending = game.pending as Pending;

  const opponents = game.playerOrder.filter((id) => id !== you);

  const militiaYou =
    pending?.kind === "militia_discard" && pending.player === you;

  const canSelectHand =
    isYourTurn &&
    !pending &&
    (game.turnPhase === "action" || game.turnPhase === "buy");

  if (game.phase === "game_over") {
    return (
      <div className="app-game">
        <div className="game-over-banner">
          Game over: {game.gameOverReason}
        </div>
      </div>
    );
  }

  if (game.phase !== "playing") {
    return null;
  }

  return (
    <div className="app-game">
      <div className="game-shell">
        <aside className="game-sidebar" aria-label="Other players">
          <h2>Players</h2>
          {opponents.map((pid) => {
            const st = game.players[pid];
            const isTheirTurn = activePid === pid;
            return (
              <div
                key={pid}
                className={`opp-card${isTheirTurn ? " is-turn" : ""}`}
              >
                <div className="opp-card__id">{pid.slice(0, 8)}…</div>
                <div>
                  hand {st?.handSize ?? 0} · deck {st?.deckSize ?? 0}
                </div>
                <div>
                  in play:{" "}
                  {(st?.inPlay ?? []).map((cid, i) => (
                    <span key={`${pid}-ip-${i}`}>
                      {i > 0 ? ", " : null}
                      <CardTip cardId={cid}>{cardLabel(cid)}</CardTip>
                    </span>
                  ))}
                  {(st?.inPlay ?? []).length === 0 ? "—" : null}
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
            <strong>Phase:</strong>{" "}
            <span className="phase">{game.turnPhase}</span>
          </div>
        </aside>

        <div className="game-center">
          <div className="turn-status">
            Turn:{" "}
            <span className="mono">{activePid?.slice(0, 8)}…</span>
            {" — "}
            Phase: <strong className="phase">{game.turnPhase}</strong>
            {" — "}
            Actions {game.actions} — Buys {game.buys} — Coins {game.coins}
          </div>

          <div className="supply" aria-label="Supply">
            {Object.entries(game.supply)
              .filter(([, n]) => n > 0)
              .map(([id, n]) => (
                <div key={id} className="pile">
                  <CardTip cardId={id}>
                    {cardLabel(id)} ×{n}
                  </CardTip>
                </div>
              ))}
          </div>

          <p className="trash-line">Trash: {game.trash.length} cards</p>

          {pending && (
            <div className="prompt">
              <strong>Prompt: {pending.kind}</strong>
              {pending.kind === "moat" && pending.player === you && (
                <div className="row" style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() =>
                      sendCmd({ name: "respond_moat", reveal: true })
                    }
                  >
                    Reveal Moat
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      sendCmd({ name: "respond_moat", reveal: false })
                    }
                  >
                    Do not reveal
                  </button>
                </div>
              )}
              {militiaYou && (
                <div>
                  <p>Select cards to discard (down to 3).</p>
                  <div className="hand">
                    {hand.map((c, i) => (
                      <CardTip
                        key={i}
                        cardId={c}
                        as="button"
                        type="button"
                        className={
                          selected.includes(i)
                            ? "card-btn selected"
                            : "card-btn"
                        }
                        onClick={() => toggleSel(i)}
                      >
                        {cardLabel(c)}
                      </CardTip>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      sendCmd({
                        name: "militia_discard",
                        handIndices: selected,
                      })
                    }
                  >
                    Discard selected
                  </button>
                </div>
              )}
              <pre>{JSON.stringify(pending, null, 2)}</pre>
              <p>Or send a raw engine command (JSON with a &quot;name&quot; field):</p>
              <div className="row">
                <input
                  style={{ flex: 1, minWidth: "200px" }}
                  value={rawCmd}
                  onChange={(e) => setRawCmd(e.target.value)}
                  placeholder='{"name":"cellar_discard","handIndices":[0,1]}'
                  aria-label="Raw JSON command"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sendCmd(JSON.parse(rawCmd) as Command);
                      setRawCmd("");
                    } catch {
                      setErr("Invalid JSON command");
                    }
                  }}
                >
                  Send command
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="game-player-bar">
        <div className="player-stats">
          <span>
            <strong>{game.actions}</strong> Actions
          </span>
          <span>
            <strong>{game.buys}</strong> Buys
          </span>
          <span>
            <strong>{game.coins}</strong> coins
          </span>
          {!isYourTurn && (
            <span style={{ color: "var(--text-muted)" }}>
              Waiting for opponent…
            </span>
          )}
        </div>

        {!militiaYou && (
          <div className="hand-row">
            <span className="hand-row__label">Hand:</span>
            <div className="hand">
              {hand.map((c, i) => (
                <CardTip
                  key={i}
                  cardId={c}
                  as="button"
                  type="button"
                  disabled={!canSelectHand}
                  className={
                    selected.includes(i) ? "card-btn selected" : "card-btn"
                  }
                  onClick={() => {
                    if (!canSelectHand) return;
                    toggleSel(i);
                  }}
                >
                  {cardLabel(c)}
                </CardTip>
              ))}
            </div>
          </div>
        )}

        {isYourTurn && !pending && (
          <div className="row" style={{ marginTop: "0.35rem" }}>
            {game.turnPhase === "action" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (selected.length !== 1) return;
                    sendCmd({
                      name: "play_action",
                      handIndex: selected[0]!,
                    });
                    setSelected([]);
                  }}
                  disabled={selected.length !== 1}
                >
                  Play selected action
                </button>
                <button
                  type="button"
                  onClick={() =>
                    send({ type: "command", command: { name: "enter_buy_phase" } })
                  }
                >
                  Go to buy phase
                </button>
                <button
                  type="button"
                  onClick={() => sendCmd({ name: "end_turn" })}
                >
                  End turn (skip buy / cleanup)
                </button>
              </>
            )}
            {game.turnPhase === "buy" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (selected.length !== 1) return;
                    sendCmd({
                      name: "play_treasure",
                      handIndex: selected[0]!,
                    });
                    setSelected([]);
                  }}
                  disabled={selected.length !== 1}
                >
                  Play treasure
                </button>
                <button
                  type="button"
                  onClick={() => sendCmd({ name: "play_all_treasures" })}
                >
                  Play all treasures
                </button>
                <div
                  className="row"
                  style={{ width: "100%", marginTop: "0.35rem" }}
                >
                  {Object.entries(game.supply)
                    .filter(([, n]) => n > 0)
                    .map(([id]) => (
                      <CardTip
                        key={id}
                        cardId={id}
                        as="button"
                        type="button"
                        onClick={() =>
                          sendCmd({ name: "buy", card: id as never })
                        }
                      >
                        Buy {cardLabel(id)}
                      </CardTip>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => sendCmd({ name: "end_turn" })}
                >
                  End turn (cleanup)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
