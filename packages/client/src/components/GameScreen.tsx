import {
  useCallback,
  useMemo,
  useRef,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Command, PendingPrompt } from "@dominion/engine";
import { cardLabel } from "../cardUtil.js";
import { useViewDiffFlight } from "../hooks/useViewDiffFlight.js";
import type { GameView, RoomSummary } from "../types.js";
import { CardFlightLayer } from "./CardFlightLayer.js";
import { PlaymatLayout } from "./table/PlaymatLayout.js";
import {
  PendingPromptPanel,
  promptHidesMainHand,
} from "./PendingPromptPanel.js";

function playerDisplayName(room: RoomSummary, playerId: string): string {
  const p = room.players.find((x) => x.id === playerId);
  const n = p?.name?.trim();
  if (n) return n;
  return `${playerId.slice(0, 8)}…`;
}

type Props = {
  room: RoomSummary;
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
  room,
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
  const pending = game.pending as PendingPrompt | null;

  const handRef = useRef<HTMLDivElement | null>(null);
  const inPlayRef = useRef<HTMLDivElement | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);

  const getSupplyPile = useCallback(
    (cardId: string) =>
      document.querySelector<HTMLElement>(`[data-pile-id="${cardId}"]`),
    [],
  );

  const zoneRefs = useMemo(
    () => ({
      hand: handRef,
      inPlay: inPlayRef,
      deck: deckRef,
      discard: discardRef,
      getSupplyPile,
    }),
    [getSupplyPile],
  );

  const { flight, clearFlight } = useViewDiffFlight(
    game,
    you,
    zoneRefs,
    game.phase === "playing",
  );

  const hideHandForPrompt = promptHidesMainHand(pending, you, hand);

  const canSelectHand =
    isYourTurn &&
    !pending &&
    (game.turnPhase === "action" || game.turnPhase === "buy");

  const dndEnabled = canSelectHand;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || !isYourTurn || pending) return;
      const a = String(active.id);
      if (!a.startsWith("hand-")) return;
      const handIndex = parseInt(a.slice(5), 10);
      if (Number.isNaN(handIndex)) return;
      if (String(over.id) === "play-mat" && game.turnPhase === "action") {
        sendCmd({ name: "play_action", handIndex });
        setSelected([]);
        return;
      }
      if (String(over.id) === "treasure-mat" && game.turnPhase === "buy") {
        sendCmd({ name: "play_treasure", handIndex });
        setSelected([]);
      }
    },
    [isYourTurn, pending, game.turnPhase, sendCmd, setSelected],
  );

  const onBuy = useCallback(
    (id: string) => {
      sendCmd({ name: "buy", card: id as never });
    },
    [sendCmd],
  );

  const onSupplyPileKeyDown = useCallback(
    (e: KeyboardEvent, id: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (game.supply[id]! > 0) onBuy(id);
      }
    },
    [game.supply, onBuy],
  );

  const pdn = useCallback(
    (pid: string) => playerDisplayName(room, pid),
    [room],
  );

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
    <div className="app-game playmat-app">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="playmat__scroll">
          <PlaymatLayout
            game={game}
            you={you}
            hand={hand}
            activePid={activePid}
            playerDisplayName={pdn}
            handRef={handRef}
            inPlayRef={inPlayRef}
            deckRef={deckRef}
            discardRef={discardRef}
            turnPhase={game.turnPhase}
            selected={selected}
            toggleSel={toggleSel}
            hideHand={hideHandForPrompt}
            canSelectHand={canSelectHand}
            dndEnabled={dndEnabled}
            isBuyPhase={game.turnPhase === "buy"}
            onBuy={onBuy}
            onSupplyPileKeyDown={onSupplyPileKeyDown}
            promptSlot={
              pending ? (
                <PendingPromptPanel
                  room={room}
                  game={game}
                  you={you}
                  hand={hand}
                  yourDiscard={game.yourDiscard ?? []}
                  selected={selected}
                  toggleSel={toggleSel}
                  sendCmd={sendCmd}
                  rawCmd={rawCmd}
                  setRawCmd={setRawCmd}
                  setErr={setErr}
                />
              ) : null
            }
          />
        </div>

        <div className="playmat__controls game-player-bar">
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
                        <button
                          key={id}
                          type="button"
                          onClick={() => sendCmd({ name: "buy", card: id as never })}
                        >
                          Buy {cardLabel(id)}
                        </button>
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
      </DndContext>

      <CardFlightLayer flight={flight} onComplete={clearFlight} />
    </div>
  );
}
