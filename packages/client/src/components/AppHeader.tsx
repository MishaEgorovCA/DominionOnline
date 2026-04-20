import { useCallback, useState } from "react";
import { EditablePlayerName } from "./EditablePlayerName.js";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="room-code-visibility-btn__icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg
      className="room-code-visibility-btn__icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 1l22 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  const [copied, setCopied] = useState(false);

  const copyRoomCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [roomId]);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <span className="app-header__brand">Dominion Online</span>
      </div>
      <div className="app-header__center">
        <div className="room-code-block">
          <span className="room-code-block__label">Room code</span>
          <div className="room-code-block__row">
            <button
              type="button"
              className="room-pill room-pill--copy"
              data-masked={roomCodeVisible ? undefined : true}
              onClick={copyRoomCode}
              title="Copy room code"
              aria-label="Copy room code to clipboard"
            >
              {roomCodeVisible ? roomId : roomId.replace(/./g, "•")}
            </button>
            <button
              type="button"
              className="room-code-visibility-btn"
              onClick={() => setRoomCodeVisible((v) => !v)}
              title={roomCodeVisible ? "Hide room code" : "Show room code"}
              aria-label={
                roomCodeVisible ? "Hide room code" : "Show room code"
              }
              aria-pressed={roomCodeVisible}
            >
              <EyeIcon open={roomCodeVisible} />
            </button>
          </div>
          {copied ? (
            <span className="room-code-block__copied" aria-live="polite">
              Copied
            </span>
          ) : null}
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
