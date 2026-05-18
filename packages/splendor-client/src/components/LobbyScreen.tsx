import type { RoomSummary, SplendorGameVersion } from "../types.js";

const EXPANSIONS: { id: SplendorGameVersion; label: string }[] = [
  { id: "BASE_ORIENT", label: "Base + Orient" },
  { id: "BASE_ORIENT_CITIES", label: "Base + Orient + Cities" },
  { id: "BASE_ORIENT_TRADE_ROUTES", label: "Base + Orient + Trade Routes" },
];

type Props = {
  room: RoomSummary;
  you: string | null;
  send: (msg: object) => void;
};

export function LobbyScreen({ room, you, send }: Props) {
  const bySeat = (seat: number) =>
    room.players.find((p) => p.seat === seat) ?? null;
  const version = room.gameVersion ?? "BASE_ORIENT";
  const isHost = room.hostId === you;

  return (
    <div className="lobby">
      <p className="hint">
        Choose a seat (2–4 players). The host picks the expansion and starts the
        game.
      </p>

      <div className="expansion-picker">
        <h3>Expansion</h3>
        {isHost ? (
          <div className="expansion-options">
            {EXPANSIONS.map((ex) => (
              <label key={ex.id} className="expansion-option">
                <input
                  type="radio"
                  name="expansion"
                  checked={version === ex.id}
                  onChange={() =>
                    send({ type: "setGameVersion", version: ex.id })
                  }
                />
                {ex.label}
              </label>
            ))}
          </div>
        ) : (
          <p className="hint">
            {EXPANSIONS.find((e) => e.id === version)?.label ?? version}
          </p>
        )}
      </div>

      <div className="seats">
        {[0, 1, 2, 3].map((seat) => {
          const p = bySeat(seat);
          const isMine = p?.id === you;
          return (
            <div
              key={seat}
              className={`seat${isMine ? " seat--mine" : ""}`}
            >
              <div className="seat__label">Seat {seat + 1}</div>
              <div className="seat__name">{p ? p.name : "Open"}</div>
              {!p && you ? (
                <button
                  type="button"
                  onClick={() => send({ type: "claimSeat", seatIndex: seat })}
                >
                  Take seat
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {isHost && (
        <button
          type="button"
          className="primary"
          onClick={() => send({ type: "startGame" })}
        >
          Start game
        </button>
      )}
    </div>
  );
}


