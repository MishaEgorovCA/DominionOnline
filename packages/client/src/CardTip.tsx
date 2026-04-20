import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { type CardId, formatCardTooltip, getCard } from "@dominion/engine";

type Props = {
  cardId: string;
  children: ReactNode;
  as?: "span" | "button";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

const GAP = 4;
const MARGIN = 8;
const CLOSE_DELAY_MS = 200;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function CardTip({
  cardId,
  children,
  as = "span",
  className = "",
  onClick,
  disabled,
  type = "button",
}: Props) {
  const text = formatCardTooltip(cardId);
  let cardName: string;
  try {
    cardName = getCard(cardId as CardId).name;
  } catch {
    cardName = cardId;
  }
  const ariaLabel = `${cardName}, card details`;

  const wrapRef = useRef<HTMLButtonElement | HTMLSpanElement | null>(null);
  const popupRef = useRef<HTMLSpanElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const tipId = useId();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const [scrollable, setScrollable] = useState(false);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  const updatePosition = useCallback(() => {
    const wrap = wrapRef.current;
    const popup = popupRef.current;
    if (!wrap || !popup || !open) return;

    const trigger = wrap.getBoundingClientRect();
    if (
      trigger.bottom < 0 ||
      trigger.top > window.innerHeight ||
      trigger.right < 0 ||
      trigger.left > window.innerWidth
    ) {
      setOpen(false);
      return;
    }

    const popupRect = popup.getBoundingClientRect();
    const popupW = popupRect.width;
    const rawH = popupRect.height;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const maxViewportH = Math.min(vh * 0.85, vh - 2 * MARGIN);
    const effectiveH = Math.min(rawH, maxViewportH);

    let top = trigger.bottom + GAP;
    if (top + effectiveH > vh - MARGIN) {
      const aboveTop = trigger.top - GAP - effectiveH;
      if (aboveTop >= MARGIN) {
        top = aboveTop;
      } else {
        top = MARGIN;
      }
    }

    const left = clamp(trigger.left, MARGIN, vw - popupW - MARGIN);
    const maxHeightPx = Math.min(
      vh * 0.85,
      Math.max(MARGIN * 2, vh - top - MARGIN),
    );

    setPos({ top, left, maxHeight: maxHeightPx });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      setScrollable(false);
      return;
    }
    updatePosition();
  }, [open, text, cardId, updatePosition]);

  useLayoutEffect(() => {
    if (!open || !pos || !popupRef.current) return;
    const el = popupRef.current;
    const id = requestAnimationFrame(() => {
      setScrollable(el.scrollHeight > el.clientHeight + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [open, pos, text]);

  useEffect(() => {
    if (!open) return;

    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  const showTip = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const hideTip = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const commonWrapProps = {
    className: `card-tip-wrap ${className}`.trim(),
    "aria-label": ariaLabel,
    "aria-describedby": open ? tipId : undefined,
    onPointerEnter: showTip,
    onPointerLeave: hideTip,
    onFocus: showTip,
    onBlur: () => {
      cancelClose();
      setOpen(false);
    },
  };

  const tipNode =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <span
        ref={popupRef}
        id={tipId}
        className="card-tip-popup"
        role="tooltip"
        style={
          pos
            ? {
                position: "fixed",
                top: pos.top,
                left: pos.left,
                zIndex: 10000,
                maxHeight: pos.maxHeight,
                overflowY: "auto",
                pointerEvents: scrollable ? "auto" : "none",
              }
            : {
                position: "fixed",
                left: -9999,
                top: 0,
                zIndex: 10000,
                visibility: "hidden" as const,
                pointerEvents: "none" as const,
              }
        }
        onPointerEnter={scrollable ? showTip : undefined}
        onPointerLeave={scrollable ? hideTip : undefined}
      >
        {text}
      </span>,
      document.body,
    );

  if (as === "button") {
    return (
      <>
        <button
          type={type}
          ref={wrapRef as RefObject<HTMLButtonElement>}
          {...commonWrapProps}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </button>
        {tipNode}
      </>
    );
  }

  return (
    <>
      <span
        ref={wrapRef as RefObject<HTMLSpanElement>}
        {...commonWrapProps}
      >
        {children}
      </span>
      {tipNode}
    </>
  );
}
