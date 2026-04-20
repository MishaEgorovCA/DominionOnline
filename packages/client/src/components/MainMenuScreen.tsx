import { EditablePlayerName } from "./EditablePlayerName.js";

type Props = {
  roomId: string;
  name: string;
  onRoomIdChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onCreateRoom: () => void;
  onJoin: () => void;
};

export function MainMenuScreen({
  roomId,
  name,
  onRoomIdChange,
  onNameChange,
  onCreateRoom,
  onJoin,
}: Props) {
  return (
    <div className="app-main-menu-shell">
      <div className="app-main-menu__bar">
        <EditablePlayerName name={name} onNameChange={onNameChange} />
      </div>
      <div className="app-main-menu">
        <h1 className="app-main-menu__title">Dominion Online</h1>
        <p className="app-main-menu__subtitle">2nd edition · base set</p>
        <button
          type="button"
          className="app-main-menu__create"
          onClick={onCreateRoom}
        >
          Create room
        </button>
        <p className="app-main-menu__join-label">Or join:</p>
        <div className="app-main-menu__join-row">
          <input
            value={roomId}
            onChange={(e) => onRoomIdChange(e.target.value)}
            placeholder="Room code"
            aria-label="Room code"
            autoComplete="off"
          />
          <button type="button" onClick={onJoin} disabled={!roomId.trim()}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
