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
    <header className="header">
      <div className="header__left">
        <span className="room-code">Room: {roomId}</span>
        <EditablePlayerName
          name={name}
          onNameChange={(n) => {
            onNameChange(n);
            onNameCommit(n);
          }}
        />
      </div>
      <button type="button" className="leave-btn" onClick={onLeave}>
        Leave
      </button>
    </header>
  );
}
