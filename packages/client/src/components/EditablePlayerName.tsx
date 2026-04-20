import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  onNameChange: (next: string) => void;
  onCommit?: (committed: string) => void;
};

export function EditablePlayerName({ name, onNameChange, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const committed = draft.trim() || "Player";
    onNameChange(committed);
    onCommit?.(committed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="editable-name__trigger"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        title="Click to edit display name"
        aria-label="Display name, click to edit"
      >
        {name || "Player"}
      </button>
    );
  }

  return (
    <div className="editable-name">
      <input
        ref={inputRef}
        className="editable-name__input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={cancel}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="Player"
        aria-label="Display name"
        autoComplete="off"
      />
      <button
        type="button"
        className="editable-name__check"
        aria-label="Save display name"
        title="Save"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
      >
        ✓
      </button>
    </div>
  );
}
