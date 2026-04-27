import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardTip } from "../../CardTip.js";
import { CardFace } from "../CardFace.js";
import type { CSSProperties } from "react";

type Props = {
  handIndex: number;
  cardId: string;
  selected: boolean;
  disabled: boolean;
  dndEnabled: boolean;
  onClick: () => void;
  fanClass?: string;
};

/**
 * When `dndEnabled`, the button is a @dnd-kit draggable to play / treasure.
 */
export function DraggableHandCard({
  handIndex,
  cardId,
  selected,
  disabled,
  dndEnabled,
  onClick,
  fanClass = "",
}: Props) {
  const id = `hand-${handIndex}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled: !dndEnabled || disabled,
    });
  const dndStyle: CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <CardTip
      cardId={cardId}
      as="button"
      type="button"
      disabled={disabled}
      dndSetNodeRef={dndEnabled ? setNodeRef : undefined}
      dndButtonProps={
        dndEnabled ? { ...attributes, ...listeners, style: dndStyle } : undefined
      }
      onClick={onClick}
      className={`hand-fan__wrap${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""} ${fanClass}`.trim()}
    >
      <div
        className="hand-fan__inner"
        data-hand-idx={handIndex}
      >
        <CardFace cardId={cardId} size="md" className="hand-fan__face" />
      </div>
    </CardTip>
  );
}
