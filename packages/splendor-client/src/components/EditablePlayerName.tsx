import { useState } from "react";

type Props = {
  name: string;
  onNameChange: (n: string) => void;
};

export function EditablePlayerName({ name, onNameChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <input
        className="player-name-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const t = draft.trim() || "Player";
          onNameChange(t);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      className="player-name-btn"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name}
    </button>
  );
}
