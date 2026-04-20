import { CardTip } from "../CardTip.js";
import { cardLabel } from "../cardUtil.js";
import type { RoomSummary } from "../types.js";

type Props = {
  room: RoomSummary;
  you: string | null;
  send: (msg: object) => void;
};

export function LobbyScreen({ room, you, send }: Props) {
  const bySeat = (seat: number) =>
    room.players.find((p) => p.seat === seat) ?? null;

  return (
    <div className="app-lobby">
      <p className="app-lobby__hint">
        Take an open seat. The host can start when at least two players are
        seated.
      </p>

      <div className="seat-ring-wrap">
        <div className="seat-ring" aria-label="Seat map">
          {[0, 1, 2, 3, 4, 5].map((seat) => {
            const p = bySeat(seat);
            const isMine = p?.id === you;
            return (
              <div
                key={seat}
                className={`seat-slot${isMine ? " is-mine" : ""}`}
                data-seat={seat}
              >
                <div className="seat-slot__inner">
                  <div className="seat-slot__num">Seat {seat}</div>
                  <div className="seat-slot__name">
                    {p ? p.name : "Open"}
                  </div>
                  {!p && you ? (
                    <div className="seat-slot__pick">
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: "claimSeat", seatIndex: seat })
                        }
                      >
                        Select seat
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="app-lobby__hint" style={{ marginTop: "1rem" }}>
        Players:{" "}
        {room.players.map((p) => p.name).join(", ") || "—"}
      </p>

      <div className="lobby-actions">
        {room.hostId === you && (
          <button type="button" onClick={() => send({ type: "startGame" })}>
            Start game
          </button>
        )}
        {room.hostId === you && (
          <button type="button" onClick={() => send({ type: "shuffleSeats" })}>
            Shuffle seats
          </button>
        )}
        <button
          type="button"
          onClick={() => send({ type: "randomizeKingdom" })}
          disabled={room.hostId !== you}
        >
          Random kingdom
        </button>
      </div>

      <div className="lobby-kingdom-wrap">
        <h2>Kingdom</h2>
        <div className="kingdom-grid">
          {(room.kingdom ?? []).map((k) => (
            <div key={k} className="kingdom-cell">
              <CardTip cardId={k}>{cardLabel(k)}</CardTip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
