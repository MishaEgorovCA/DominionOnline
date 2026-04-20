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
  return (
    <header className="app-header">
      <span className="app-header__brand">Dominion Online</span>
      <div className="app-header__room">
        <span className="sr-only">Room</span>
        <span className="room-pill" title="Room code">
          {roomId}
        </span>
      </div>
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
    </header>
  );
}
