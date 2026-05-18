type Props = {
  room: {
    roomId: string;
    hostId: string;
    players: { id: string; name: string; seat: number | null }[];
    started: boolean;
  };
  you: string | null;
  send: (msg: object) => void;
};

export function LobbyScreen({ room, you, send }: Props) {
  const bySeat = (seat: number) =>
    room.players.find((p) => p.seat === seat) ?? null;

  return (
    <div className="lobby">
      <p className="hint">
        Choose a seat (2–4 players). The host starts the game.
      </p>
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
      {room.hostId === you && (
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
