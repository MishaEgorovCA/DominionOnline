import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  CardId,
  Command,
  PendingPrompt,
  SentryFate,
} from "@dominion/engine";
import {
  getCard,
  isActionCard,
  isTreasure,
  isVictory,
} from "@dominion/engine";
import { CardTip } from "../CardTip.js";
import { cardLabel } from "../cardUtil.js";
import type { GameView, RoomSummary } from "../types.js";

type Fate = SentryFate;

function playerDisplayName(room: RoomSummary, playerId: string): string {
  const p = room.players.find((x) => x.id === playerId);
  const n = p?.name?.trim();
  if (n) return n;
  return `${playerId.slice(0, 8)}…`;
}

export function getPromptActor(pending: PendingPrompt): string {
  if (pending.kind === "bandit_react") return pending.victim;
  return pending.player;
}

/** Hand is shown in the prompt panel; hide duplicate hand in the player bar. */
export function promptHidesMainHand(
  pending: PendingPrompt | null,
  you: string,
  hand: string[],
): boolean {
  if (!pending) return false;
  const actor = getPromptActor(pending);
  if (actor !== you) return false;
  switch (pending.kind) {
    case "militia_discard":
    case "cellar":
    case "chapel":
    case "poacher":
    case "remodel_trash":
    case "mine":
    case "throne_room_pick":
    case "artisan_topdeck":
      return true;
    case "bureaucrat_react":
      return hand.some((c) => isVictory(c as CardId));
    default:
      return false;
  }
}

function HandSelectGrid({
  hand,
  selected,
  toggleSel,
  maxSelect,
}: {
  hand: string[];
  selected: number[];
  toggleSel: (i: number) => void;
  maxSelect?: number;
}) {
  const onPick = (i: number) => {
    if (
      maxSelect !== undefined &&
      !selected.includes(i) &&
      selected.length >= maxSelect
    ) {
      return;
    }
    toggleSel(i);
  };
  return (
    <div className="hand">
      {hand.map((c, i) => (
        <CardTip
          key={i}
          cardId={c}
          as="button"
          type="button"
          className={
            selected.includes(i) ? "card-btn selected" : "card-btn"
          }
          onClick={() => onPick(i)}
        >
          {cardLabel(c)}
        </CardTip>
      ))}
    </div>
  );
}

function SentryControls({
  lifted,
  sendCmd,
}: {
  lifted: string[];
  sendCmd: (c: Command) => void;
}) {
  const [a, setA] = useState<Fate | null>(null);
  const [b, setB] = useState<Fate | null>(null);
  const [deckOrder, setDeckOrder] = useState<[0, 1] | [1, 0] | null>(null);

  useEffect(() => {
    setA(null);
    setB(null);
    setDeckOrder(null);
  }, [lifted.join(",")]);

  const fateButtons = (value: Fate | null, set: (f: Fate) => void) => (
    <div className="row" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
      {(["trash", "discard", "deck"] as const).map((f) => (
        <button
          key={f}
          type="button"
          className={value === f ? "card-btn selected" : undefined}
          onClick={() => set(f)}
        >
          {f === "deck" ? "Topdeck" : f}
        </button>
      ))}
    </div>
  );

  const submit = () => {
    if (lifted.length === 1) {
      if (!a) return;
      sendCmd({
        name: "sentry_resolve",
        a,
        b: "discard",
      });
      return;
    }
    if (!a || !b) return;
    if (a === "deck" && b === "deck") {
      if (!deckOrder) return;
      sendCmd({ name: "sentry_resolve", a, b, deckOrder });
    } else {
      sendCmd({ name: "sentry_resolve", a, b });
    }
  };

  if (lifted.length === 0) return null;

  if (lifted.length === 1) {
    return (
      <div>
        <p>Choose what to do with the revealed card.</p>
        <CardTip cardId={lifted[0]!}>{cardLabel(lifted[0]!)}</CardTip>
        <div style={{ marginTop: "0.5rem" }}>{fateButtons(a, setA)}</div>
        <button
          type="button"
          style={{ marginTop: "0.5rem" }}
          disabled={!a}
          onClick={submit}
        >
          Apply
        </button>
      </div>
    );
  }

  const [c0, c1] = lifted as [string, string];
  const needOrder = a === "deck" && b === "deck";

  return (
    <div>
      <p>For each card, choose trash, discard, or topdeck.</p>
      <div className="row" style={{ alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div>First</div>
          <CardTip cardId={c0}>{cardLabel(c0)}</CardTip>
          {fateButtons(a, setA)}
        </div>
        <div>
          <div>Second</div>
          <CardTip cardId={c1}>{cardLabel(c1)}</CardTip>
          {fateButtons(b, setB)}
        </div>
      </div>
      {needOrder && (
        <div style={{ marginTop: "0.75rem" }}>
          <p>Which card is on top of your deck (drawn first)?</p>
          <div className="row">
            <button
              type="button"
              className={deckOrder?.[0] === 0 ? "card-btn selected" : undefined}
              onClick={() => setDeckOrder([0, 1])}
            >
              {cardLabel(c0)} on top
            </button>
            <button
              type="button"
              className={deckOrder?.[0] === 1 ? "card-btn selected" : undefined}
              onClick={() => setDeckOrder([1, 0])}
            >
              {cardLabel(c1)} on top
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        style={{ marginTop: "0.75rem" }}
        disabled={!a || !b || (needOrder && !deckOrder)}
        onClick={submit}
      >
        Apply
      </button>
    </div>
  );
}

type Props = {
  room: RoomSummary;
  game: GameView;
  you: string;
  hand: string[];
  yourDiscard: string[];
  selected: number[];
  toggleSel: (i: number) => void;
  sendCmd: (c: Command) => void;
  rawCmd: string;
  setRawCmd: (s: string) => void;
  setErr: (e: string | null) => void;
};

export function PendingPromptPanel({
  room,
  game,
  you,
  hand,
  yourDiscard,
  selected,
  toggleSel,
  sendCmd,
  rawCmd,
  setRawCmd,
  setErr,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const pending = game.pending as PendingPrompt | null;

  const supplyGainPile = useCallback(
    (maxCost: number) =>
      Object.entries(game.supply)
        .filter(([id, n]) => n > 0 && getCard(id as CardId).cost <= maxCost)
        .sort(([a], [b]) => getCard(a as CardId).cost - getCard(b as CardId).cost),
    [game.supply],
  );

  if (!pending) return null;

  const actor = getPromptActor(pending);
  const isYou = actor === you;

  const waitingLine = !isYou && (
    <p className="prompt-waiting">
      Waiting for {playerDisplayName(room, actor)}…
    </p>
  );

  const advancedBlock = (
    <div className="prompt-advanced">
      <button
        type="button"
        className="prompt-advanced-toggle"
        aria-expanded={showAdvanced}
        aria-label="Advanced: raw engine command"
        title="Advanced"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        <span aria-hidden>⚙</span>
      </button>
      {showAdvanced && (
        <div className="prompt-advanced-panel">
          <pre>{JSON.stringify(pending, null, 2)}</pre>
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
  );

  let body: ReactNode = null;

  if (isYou) {
    switch (pending.kind) {
      case "moat":
        body = (
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
        );
        break;
      case "militia_discard": {
        const need = Math.max(0, hand.length - 3);
        body = (
          <div>
            <p>
              Select {need} card{need === 1 ? "" : "s"} to discard (down to 3
              in hand).
            </p>
            <HandSelectGrid
              hand={hand}
              selected={selected}
              toggleSel={toggleSel}
              maxSelect={need}
            />
            <button
              type="button"
              style={{ marginTop: "0.5rem" }}
              disabled={selected.length !== need}
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
        );
        break;
      }
      case "bureaucrat_react": {
        const victoryIdx = hand
          .map((c, i) => (isVictory(c as CardId) ? i : -1))
          .filter((i) => i >= 0);
        body =
          victoryIdx.length === 0 ? (
            <button
              type="button"
              onClick={() =>
                sendCmd({ name: "bureaucrat_pick", handIndex: null })
              }
            >
              No victory card in hand
            </button>
          ) : (
            <div>
              <p>Choose a victory card to topdeck (or use a card below).</p>
              <div className="hand">
                {victoryIdx.map((i) => (
                  <CardTip
                    key={i}
                    cardId={hand[i]!}
                    as="button"
                    type="button"
                    className="card-btn"
                    onClick={() =>
                      sendCmd({
                        name: "bureaucrat_pick",
                        handIndex: i,
                      })
                    }
                  >
                    {cardLabel(hand[i]!)}
                  </CardTip>
                ))}
              </div>
            </div>
          );
        break;
      }
      case "bandit_react": {
        const [c0, c1] = pending.lifted;
        body = (
          <div>
            <p>Choose which treasure to trash (the other is discarded).</p>
            <div className="row" style={{ gap: "0.75rem" }}>
              <CardTip cardId={c0}>{cardLabel(c0)}</CardTip>
              <CardTip cardId={c1}>{cardLabel(c1)}</CardTip>
            </div>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() =>
                  sendCmd({ name: "bandit_pick", trashIndex: 0 })
                }
              >
                Trash {cardLabel(c0)}
              </button>
              <button
                type="button"
                onClick={() =>
                  sendCmd({ name: "bandit_pick", trashIndex: 1 })
                }
              >
                Trash {cardLabel(c1)}
              </button>
            </div>
          </div>
        );
        break;
      }
      case "cellar":
        body = (
          <div>
            <p>Select any number of cards to discard, then draw that many.</p>
            <HandSelectGrid
              hand={hand}
              selected={selected}
              toggleSel={toggleSel}
            />
            <button
              type="button"
              style={{ marginTop: "0.5rem" }}
              onClick={() =>
                sendCmd({
                  name: "cellar_discard",
                  handIndices: selected,
                })
              }
            >
              Discard & draw
            </button>
          </div>
        );
        break;
      case "chapel":
        body = (
          <div>
            <p>Trash up to 4 cards from your hand.</p>
            <HandSelectGrid
              hand={hand}
              selected={selected}
              toggleSel={toggleSel}
              maxSelect={4}
            />
            <button
              type="button"
              style={{ marginTop: "0.5rem" }}
              onClick={() =>
                sendCmd({
                  name: "chapel_trash",
                  handIndices: selected,
                })
              }
            >
              Trash selected
            </button>
          </div>
        );
        break;
      case "harbinger":
        body =
          yourDiscard.length === 0 ? (
            <button
              type="button"
              onClick={() =>
                sendCmd({ name: "harbinger_putback", discardIndex: null })
              }
            >
              Continue (discard empty)
            </button>
          ) : (
            <div>
              <p>Put back one card from your discard onto your deck, or skip.</p>
              <div className="hand">
                {yourDiscard.map((c, i) => (
                  <CardTip
                    key={i}
                    cardId={c}
                    as="button"
                    type="button"
                    className="card-btn"
                    onClick={() =>
                      sendCmd({
                        name: "harbinger_putback",
                        discardIndex: i,
                      })
                    }
                  >
                    {cardLabel(c)} (#{i})
                  </CardTip>
                ))}
              </div>
              <button
                type="button"
                style={{ marginTop: "0.5rem" }}
                onClick={() =>
                  sendCmd({
                    name: "harbinger_putback",
                    discardIndex: null,
                  })
                }
              >
                Skip
              </button>
            </div>
          );
        break;
      case "library_choice":
        body = (
          <div>
            <p>
              Library revealed:{" "}
              <CardTip cardId={pending.card}>{cardLabel(pending.card)}</CardTip>
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Set aside: {pending.setAside.length} card
              {pending.setAside.length === 1 ? "" : "s"}
            </p>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() =>
                  sendCmd({ name: "library_choice", setAside: false })
                }
              >
                Keep (add to hand)
              </button>
              <button
                type="button"
                onClick={() =>
                  sendCmd({ name: "library_choice", setAside: true })
                }
              >
                Set aside
              </button>
            </div>
          </div>
        );
        break;
      case "mine": {
        const treasureIdx = hand
          .map((c, i) => (isTreasure(c as CardId) ? i : -1))
          .filter((i) => i >= 0);
        body =
          treasureIdx.length === 0 ? (
            <p>No treasure in hand to trash.</p>
          ) : (
            <div>
              <p>Trash a treasure to upgrade it.</p>
              <div className="hand">
                {treasureIdx.map((i) => (
                  <CardTip
                    key={i}
                    cardId={hand[i]!}
                    as="button"
                    type="button"
                    className="card-btn"
                    onClick={() =>
                      sendCmd({ name: "mine_pick", handIndex: i })
                    }
                  >
                    {cardLabel(hand[i]!)}
                  </CardTip>
                ))}
              </div>
            </div>
          );
        break;
      }
      case "moneylender": {
        const hasCopper = hand.includes("copper");
        body = (
          <div className="row" style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              disabled={!hasCopper}
              onClick={() =>
                sendCmd({ name: "moneylender", trashCopper: true })
              }
            >
              Trash Copper (+3 coins)
            </button>
            <button
              type="button"
              onClick={() =>
                sendCmd({ name: "moneylender", trashCopper: false })
              }
            >
              Decline
            </button>
          </div>
        );
        break;
      }
      case "poacher": {
        const n = pending.emptyPiles;
        body = (
          <div>
            <p>
              Discard exactly {n} card{n === 1 ? "" : "s"} (empty piles: {n}).
            </p>
            <HandSelectGrid
              hand={hand}
              selected={selected}
              toggleSel={toggleSel}
              maxSelect={n}
            />
            <button
              type="button"
              style={{ marginTop: "0.5rem" }}
              disabled={selected.length !== n}
              onClick={() =>
                sendCmd({
                  name: "poacher_discard",
                  handIndices: selected,
                })
              }
            >
              Discard selected
            </button>
          </div>
        );
        break;
      }
      case "remodel_trash":
        body = (
          <div>
            <p>Trash one card from your hand.</p>
            <HandSelectGrid
              hand={hand}
              selected={selected}
              toggleSel={toggleSel}
              maxSelect={1}
            />
            <button
              type="button"
              style={{ marginTop: "0.5rem" }}
              disabled={selected.length !== 1}
              onClick={() =>
                sendCmd({
                  name: "remodel_trash",
                  handIndex: selected[0]!,
                })
              }
            >
              Trash selected
            </button>
          </div>
        );
        break;
      case "remodel_gain": {
        const piles = supplyGainPile(pending.trashedCost + 2);
        body = (
          <div>
            <p>
              Gain a card costing up to {pending.trashedCost + 2} coins.
            </p>
            <div className="supply" style={{ marginTop: "0.5rem" }}>
              {piles.map(([id]) => (
                <div key={id} className="pile">
                  <CardTip
                    cardId={id}
                    as="button"
                    type="button"
                    onClick={() =>
                      sendCmd({ name: "remodel_gain", card: id as CardId })
                    }
                  >
                    {cardLabel(id)}
                  </CardTip>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      }
      case "sentry":
        body = (
          <SentryControls lifted={pending.lifted} sendCmd={sendCmd} />
        );
        break;
      case "throne_room_pick": {
        const actionIdx = hand
          .map((c, i) => (isActionCard(c as CardId) ? i : -1))
          .filter((i) => i >= 0);
        body =
          actionIdx.length === 0 ? (
            <p>No action card in hand.</p>
          ) : (
            <div>
              <p>Choose an action to play twice.</p>
              <div className="hand">
                {actionIdx.map((i) => (
                  <CardTip
                    key={i}
                    cardId={hand[i]!}
                    as="button"
                    type="button"
                    className="card-btn"
                    onClick={() =>
                      sendCmd({ name: "throne_room_pick", handIndex: i })
                    }
                  >
                    {cardLabel(hand[i]!)}
                  </CardTip>
                ))}
              </div>
            </div>
          );
        break;
      }
      case "vassal":
        body = (
          <div>
            <p>
              Vassal revealed:{" "}
              <CardTip cardId={pending.card}>{cardLabel(pending.card)}</CardTip>
            </p>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() =>
                  sendCmd({ name: "vassal_play", play: true })
                }
              >
                Play
              </button>
              <button
                type="button"
                onClick={() =>
                  sendCmd({ name: "vassal_play", play: false })
                }
              >
                Discard
              </button>
            </div>
          </div>
        );
        break;
      case "workshop": {
        const piles = supplyGainPile(4);
        body = (
          <div>
            <p>Gain a card costing up to 4.</p>
            <div className="supply" style={{ marginTop: "0.5rem" }}>
              {piles.map(([id]) => (
                <div key={id} className="pile">
                  <CardTip
                    cardId={id}
                    as="button"
                    type="button"
                    onClick={() =>
                      sendCmd({
                        name: "workshop_gain",
                        card: id as CardId,
                      })
                    }
                  >
                    {cardLabel(id)}
                  </CardTip>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      }
      case "artisan_gain": {
        const piles = supplyGainPile(5);
        body = (
          <div>
            <p>Gain a card costing up to 5 to your hand.</p>
            <div className="supply" style={{ marginTop: "0.5rem" }}>
              {piles.map(([id]) => (
                <div key={id} className="pile">
                  <CardTip
                    cardId={id}
                    as="button"
                    type="button"
                    onClick={() =>
                      sendCmd({
                        name: "artisan_gain",
                        card: id as CardId,
                      })
                    }
                  >
                    {cardLabel(id)}
                  </CardTip>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      }
      case "artisan_topdeck":
        body = (
          <div>
            <p>Choose a card from your hand to place on top of your deck.</p>
            <HandSelectGrid
              hand={hand}
              selected={selected}
              toggleSel={toggleSel}
              maxSelect={1}
            />
            <button
              type="button"
              style={{ marginTop: "0.5rem" }}
              disabled={selected.length !== 1}
              onClick={() =>
                sendCmd({
                  name: "artisan_topdeck",
                  handIndex: selected[0]!,
                })
              }
            >
              Topdeck selected
            </button>
          </div>
        );
        break;
      default:
        body = (
          <p className="prompt-unknown">
            Unsupported prompt kind (use advanced).
          </p>
        );
    }
  }

  return (
    <div className="prompt">
      <div className="prompt-header">
        <strong>Prompt: {pending.kind}</strong>
        {advancedBlock}
      </div>
      {waitingLine}
      {body}
    </div>
  );
}
