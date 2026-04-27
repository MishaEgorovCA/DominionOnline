import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

function Zone({
  id,
  className,
  label,
  children,
}: {
  id: string;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} drop-zone${isOver ? " drop-zone--over" : ""}`.trim()}
      data-drop-id={id}
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function DropPlayAction({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Zone id="play-mat" className={className} label="Play area">
      {children}
    </Zone>
  );
}

export function DropTreasurePlay({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Zone id="treasure-mat" className={className} label="Play treasures here">
      {children}
    </Zone>
  );
}
