import { useCallback } from "react";
import { GameBoard } from "./board/GameBoard.js";
import { GameModals } from "./modals/GameModals.js";
import { pulseElement } from "../animation/splendorAnimate.js";
import type { GameView } from "../types.js";

type Props = {
  game: GameView;
  myName: string;
  validActions: string[];
  send: (msg: object) => void;
};

export function GameScreen({ game, myName, validActions, send }: Props) {
  const me = game.players.find((p) => p.name === myName);
  const isMyTurn = game.currentPlayer === myName;

  const onCardClick = useCallback(
    (id: string) => {
      const el = document.querySelector(`[data-card-id="${id}"]`);
      if (el) pulseElement(el);
      if (!isMyTurn) return;
      if (validActions.includes("BUY_CARD")) {
        send({
          type: "action",
          action: "BUY_CARD",
          payload: { cardId: id, selectedTokens: { Gold: 0 } },
        });
      } else if (validActions.includes("RESERVE_CARD")) {
        send({ type: "action", action: "RESERVE_CARD", payload: { cardId: id } });
      } else if (validActions.includes("CASCADE_1")) {
        send({ type: "action", action: "CASCADE_1", payload: { cardId: id } });
      } else if (validActions.includes("CASCADE_2")) {
        send({ type: "action", action: "CASCADE_2", payload: { cardId: id } });
      }
    },
    [isMyTurn, validActions, send],
  );

  return (
    <div className="splendor-game-wrap">
      {!game.gameOver && (
        <p className="turn-banner">
          {isMyTurn
            ? "Your turn"
            : `Waiting for ${game.currentPlayer ?? "…"}`}
        </p>
      )}
      <GameBoard game={game} me={me} onCardClick={onCardClick} />
      <GameModals
        game={game}
        myName={myName}
        validActions={validActions}
        send={send}
      />
    </div>
  );
}
