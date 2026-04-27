import type { KeyboardEvent, ReactNode, RefObject } from "react";
import type { GameView } from "../../types.js";
import { CardFace } from "../CardFace.js";
import { cardLabel } from "../../cardUtil.js";
import { CardTip } from "../../CardTip.js";
import { DraggableHandCard } from "./DraggableHandCard.js";
import { DropPlayAction, DropTreasurePlay } from "./DropPlayZones.js";

const TREASURE = ["copper", "silver", "gold"] as const;
const VICTORY = ["estate", "duchy", "province", "curse"] as const;

type Props = {
  game: GameView;
  you: string;
  hand: string[];
  activePid: string | null;
  playerDisplayName: (pid: string) => string;
  handRef: RefObject<HTMLDivElement | null>;
  inPlayRef: RefObject<HTMLDivElement | null>;
  deckRef: RefObject<HTMLDivElement | null>;
  discardRef: RefObject<HTMLDivElement | null>;
  turnPhase: string;
  selected: number[];
  toggleSel: (i: number) => void;
  hideHand: boolean;
  canSelectHand: boolean;
  dndEnabled: boolean;
  isBuyPhase: boolean;
  onBuy: (id: string) => void;
  onSupplyPileKeyDown: (e: KeyboardEvent, id: string) => void;
  promptSlot: ReactNode;
};

/**
 * physical-style board: treasure column | kingdom + status | victory/curse
 */
export function PlaymatLayout({
  game,
  you,
  hand,
  activePid,
  playerDisplayName,
  handRef,
  inPlayRef,
  deckRef,
  discardRef,
  turnPhase,
  selected,
  toggleSel,
  hideHand,
  canSelectHand,
  dndEnabled,
  isBuyPhase,
  onBuy,
  onSupplyPileKeyDown,
  promptSlot,
}: Props) {
  const youSt = game.players[you];
  if (!youSt) return null;
  const order = game.playerOrder;
  const others = order.filter((id) => id !== you);

  const yourInPlay =
    youSt.inPlay.length === 0 ? (
      <span className="playmat-opp__empty">In play (empty)</span>
    ) : (
      youSt.inPlay.map((cid, i) => (
        <div key={`you-ip-${i}`} className="playmat-inplay-card">
          <CardTip cardId={cid} as="span" className="playmat-opp__tip">
            <CardFace cardId={cid} size="sm" />
          </CardTip>
        </div>
      ))
    );

  return (
    <div className="playmat">
      <div className="playmat__opponents" aria-label="Other players">
        {others.map((pid) => {
          const st = game.players[pid]!;
          const turn = activePid === pid;
          return (
            <div
              key={pid}
              className={`playmat-opp${turn ? " is-turn" : ""}`}
            >
              <div className="playmat-opp__name">
                {playerDisplayName(pid)}
              </div>
              <div className="playmat-opp__meta">
                <span>Hand: {st.handSize}</span>
                <span>Deck: {st.deckSize}</span>
                {st.setAside.length > 0 && (
                  <span>Aside: {st.setAside.length}</span>
                )}
              </div>
              <div className="playmat-opp__inplay">
                {st.inPlay.length === 0 ? (
                  <span className="playmat-opp__empty">In play: —</span>
                ) : (
                  st.inPlay.map((cid, i) => (
                    <div key={`${pid}-ip-${i}`} className="playmat-opp__card">
                      <CardTip cardId={cid} as="span" className="playmat-opp__tip">
                        <CardFace cardId={cid} size="xs" />
                      </CardTip>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="turn-status playmat__status">
        Turn: {activePid ? playerDisplayName(activePid) : "—"} — Phase:{" "}
        <strong className="phase">{turnPhase}</strong> — Actions {game.actions}{" "}
        — Buys {game.buys} — {game.coins} coins
      </div>

      <div className="playmat__grid">
        <div className="playmat__col playmat__col--treasure">
          <h3 className="playmat__coltitle">Treasure</h3>
          {TREASURE.map((id) => (
            <Pile
              key={id}
              id={id}
              n={game.supply[id] ?? 0}
              onBuy={onBuy}
              onKey={onSupplyPileKeyDown}
            />
          ))}
        </div>

        <div className="playmat__col playmat__col--kingdom">
          <h3 className="playmat__coltitle">Market</h3>
          <div className="playmat__kingdom">
            {(game.kingdom ?? []).map((id) => (
              <Pile
                key={id}
                id={id}
                n={game.supply[id] ?? 0}
                onBuy={onBuy}
                onKey={onSupplyPileKeyDown}
                compact
              />
            ))}
          </div>
        </div>

        <div className="playmat__col playmat__col--victory">
          <h3 className="playmat__coltitle">Victory &amp; curse</h3>
          {VICTORY.map((id) => (
            <Pile
              key={id}
              id={id}
              n={game.supply[id] ?? 0}
              onBuy={onBuy}
              onKey={onSupplyPileKeyDown}
            />
          ))}
        </div>
      </div>

      <p className="trash-line playmat__trash">
        Trash: {game.trash.length} cards
      </p>

      {promptSlot}

      <div className="playmat__self">
        <h3 className="playmat__youlbl">You — {playerDisplayName(you)}</h3>

        {isBuyPhase ? (
          <DropTreasurePlay className="playmat__drop-treasure">
            <p className="playmat__drop-hint">Drop a treasure from hand to play it</p>
            <div ref={inPlayRef} className="playmat__inplay playmat__inplay--wide">
              {yourInPlay}
            </div>
          </DropTreasurePlay>
        ) : (
          <DropPlayAction className="playmat__drop-action">
            <p className="playmat__drop-hint">Drop a card here to play an action</p>
            <div ref={inPlayRef} className="playmat__inplay playmat__inplay--wide">
              {yourInPlay}
            </div>
          </DropPlayAction>
        )}

        {!hideHand && (
          <div className="playmat__handrow">
            <span className="hand-row__label">Hand</span>
            <div ref={handRef} className="hand-fan">
              {hand.map((c, i) => (
                <DraggableHandCard
                  key={i}
                  handIndex={i}
                  cardId={c}
                  selected={selected.includes(i)}
                  disabled={!canSelectHand}
                  dndEnabled={dndEnabled}
                  onClick={() => {
                    if (!canSelectHand) return;
                    toggleSel(i);
                  }}
                  fanClass={`hand-fan--${hand.length}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="playmat__piles">
          <div
            className="playmat__deck"
            ref={deckRef}
            data-anim-anchor="deck"
          >
            <div className="playmat__stack">
              {youSt.deckSize > 0 ? (
                <CardFace
                  cardId="copper"
                  back
                  size="md"
                  className="playmat__back"
                />
              ) : (
                <div className="playmat__emptystack">0</div>
              )}
            </div>
            <div className="playmat__pile-lbl">Draw ({youSt.deckSize})</div>
          </div>
          <div
            className="playmat__discard"
            ref={discardRef}
            data-anim-anchor="discard"
          >
            <div className="playmat__stack playmat__stack--discard">
              {youSt.discardSize > 0 && youSt.discardTop ? (
                <CardFace
                  cardId={youSt.discardTop}
                  size="md"
                />
              ) : youSt.discardSize > 0 ? (
                <div className="playmat__emptystack">?</div>
              ) : (
                <div className="playmat__emptystack">0</div>
              )}
            </div>
            <div className="playmat__pile-lbl">Discard ({youSt.discardSize})</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pile({
  id,
  n,
  onBuy,
  onKey,
  compact,
}: {
  id: string;
  n: number;
  onBuy: (id: string) => void;
  onKey: (e: KeyboardEvent, id: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`playmat-pile${compact ? " playmat-pile--sm" : ""}${
        n === 0 ? " playmat-pile--empty" : ""
      }`.trim()}
      data-pile-id={id}
    >
      <button
        type="button"
        className="playmat-pile__btn"
        onClick={() => n > 0 && onBuy(id)}
        onKeyDown={(e) => onKey(e, id)}
        disabled={n <= 0}
        aria-label={`${cardLabel(id)} pile, ${n} left`}
      >
        {n > 0 ? <CardFace cardId={id} size={compact ? "sm" : "md"} /> : <div className="playmat-pile__gone" />}
      </button>
      <div className="playmat-pile__meta">
        <span className="playmat-pile__name">{cardLabel(id)}</span>
        <span className="playmat-pile__n">×{n}</span>
      </div>
    </div>
  );
}
