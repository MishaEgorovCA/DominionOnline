import { RoomCodeBlock } from "@dominion/ui";
import { EditablePlayerName } from "./EditablePlayerName.js";

type Props = {
  roomId: string;
  name: string;
  onNameChange: (n: string) => void;
  onNameCommit: (n: string) => void;
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
      <div className="app-header__left">
        <span className="app-header__brand">Splendor Online</span>
      </div>
      <div className="app-header__center">
        <RoomCodeBlock roomId={roomId} />
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
