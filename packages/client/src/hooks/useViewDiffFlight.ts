import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { cardImageUrl } from "../cardArt.js";
import type { GameView } from "../types.js";

export type CardFlight = {
  key: number;
  cardId: string;
  src: string;
  from: DOMRectReadOnly;
  to: DOMRectReadOnly;
};

function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Map<string, number>();
  for (const x of a) s.set(x, (s.get(x) ?? 0) + 1);
  for (const x of b) {
    const n = (s.get(x) ?? 0) - 1;
    if (n < 0) return false;
    s.set(x, n);
  }
  return [...s.values()].every((n) => n === 0);
}

function findPlayedHandIndex(
  pHand: string[],
  nHand: string[],
  card: string,
): number | null {
  for (let i = 0; i < pHand.length; i++) {
    if (pHand[i] !== card) continue;
    const without = [...pHand.slice(0, i), ...pHand.slice(i + 1)];
    if (multisetEqual(without, nHand)) return i;
  }
  return null;
}

export type FlightZoneRefs = {
  hand: RefObject<HTMLDivElement | null>;
  inPlay: RefObject<HTMLDivElement | null>;
  deck: RefObject<HTMLDivElement | null>;
  getSupplyPile: (cardId: string) => HTMLElement | null;
  discard: RefObject<HTMLDivElement | null>;
};

/**
 * Best-effort card motion hints from `GameView` diffs. Duplicate card types in
 * hand are indistinguishable; play uses the first valid multiset index.
 */
export function useViewDiffFlight(
  game: GameView,
  you: string,
  zoneRefs: FlightZoneRefs,
  enabled: boolean,
): { flight: CardFlight | null; clearFlight: () => void } {
  const prev = useRef<GameView | null>(null);
  const seq = useRef(0);
  const r = useRef(zoneRefs);
  r.current = zoneRefs;
  const [flight, setFlight] = useState<CardFlight | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      prev.current = game;
      return;
    }
    const p = prev.current;
    prev.current = game;
    if (!p || p.phase !== "playing" || game.phase !== "playing") return;

    const pYou = p.players[you];
    const nYou = game.players[you];
    if (!pYou || !nYou) return;

    const pHand = p.yourHand ?? [];
    const nHand = game.yourHand ?? [];
    const refs = r.current;

    // Play action: inPlay +1, hand loses one of that type
    if (nYou.inPlay.length === pYou.inPlay.length + 1 && nHand.length < pHand.length) {
      const added = nYou.inPlay[nYou.inPlay.length - 1]!;
      const idx = findPlayedHandIndex(pHand, nHand, added);
      if (idx != null) {
        const hEl = refs.hand.current?.querySelector<HTMLElement>(
          `[data-hand-idx="${idx}"]`,
        );
        if (hEl && refs.inPlay.current) {
          const from = hEl.getBoundingClientRect();
          const to = refs.inPlay.current.getBoundingClientRect();
          seq.current += 1;
          setFlight({
            key: seq.current,
            cardId: added,
            src: cardImageUrl(added, 0),
            from,
            to,
          });
          return;
        }
      }
    }

    // Draw: hand +1, deck -1
    if (nHand.length === pHand.length + 1 && nYou.deckSize === pYou.deckSize - 1) {
      const drawn = nHand[nHand.length - 1]!;
      if (refs.deck.current && refs.hand.current) {
        const hEl = refs.hand.current.querySelector<HTMLElement>(
          `[data-hand-idx="${nHand.length - 1}"]`,
        );
        if (hEl) {
          const from = refs.deck.current.getBoundingClientRect();
          const to = hEl.getBoundingClientRect();
          seq.current += 1;
          setFlight({
            key: seq.current,
            cardId: drawn,
            src: cardImageUrl(drawn, 0),
            from,
            to,
          });
          return;
        }
      }
    }

    // Gain to discard: supply of cid decreased by 1, discard top became cid
    for (const cid of Object.keys(p.supply) as (keyof GameView["supply"])[]) {
      const d = p.supply[cid]! - (game.supply[cid] ?? 0);
      if (d !== 1) continue;
      if (nYou.discardTop === cid && pYou.discardTop !== cid) {
        const el = refs.getSupplyPile(String(cid));
        if (el && refs.discard.current) {
          const from = el.getBoundingClientRect();
          const to = refs.discard.current.getBoundingClientRect();
          seq.current += 1;
          setFlight({
            key: seq.current,
            cardId: String(cid),
            src: cardImageUrl(String(cid), 0),
            from,
            to,
          });
          return;
        }
      }
    }
  }, [game, you, enabled]);

  const clearFlight = useCallback(() => setFlight(null), []);
  return { flight, clearFlight };
}
