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
    <div className="shell">
      <div className="bar">
        <EditablePlayerName name={name} onNameChange={onNameChange} />
      </div>
      <div className="menu">
        <h1>Splendor Online</h1>
        <p className="sub">Base game + Orient expansion</p>
        <button type="button" className="primary" onClick={onCreateRoom}>
          Create room
        </button>
        <p className="join-label">Or join with a room code:</p>
        <div className="join-row">
          <input
            value={roomId}
            onChange={(e) => onRoomIdChange(e.target.value)}
            placeholder="Room code"
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
