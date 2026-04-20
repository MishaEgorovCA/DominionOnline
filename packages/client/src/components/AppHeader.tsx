import { useState } from "react";
import { EditablePlayerName } from "./EditablePlayerName.js";

type Props = {
  roomId: string;
  name: string;
  onNameChange: (v: string) => void;
  onNameCommit: (committed: string) => void;
  onLeave: () => void;
};

export function AppHeader({
  roomId,
  name,
  onNameChange,
  onNameCommit,
  onLeave,
}: Props) {
  const [roomCodeVisible, setRoomCodeVisible] = useState(true);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <span className="app-header__brand">Dominion Online</span>
      </div>
      <div className="app-header__center">
        <div className="room-code-block">
          <span className="room-code-block__label">Room code</span>
          <button
            type="button"
            className="room-pill room-pill--toggle"
            onClick={() => setRoomCodeVisible((v) => !v)}
            title={roomCodeVisible ? "Hide room code" : "Show room code"}
            aria-label={
              roomCodeVisible ? "Hide room code" : "Show room code"
            }
            aria-pressed={roomCodeVisible}
          >
            {roomCodeVisible ? roomId : roomId.replace(/./g, "•")}
          </button>
        </div>
      </div>
      <div className="app-header__right">
        <div className="app-header__name">
          <EditablePlayerName
            name={name}
            onNameChange={onNameChange}
            onCommit={onNameCommit}
          />
        </div>
        <button
          type="button"
          className="btn-exit"
          onClick={onLeave}
          title="Return to main menu"
        >
          <span className="btn-exit__icon" aria-hidden>
            ⎋
          </span>
          Main menu
        </button>
      </div>
    </header>
  );
}
