import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";
import {
  cardBackImageUrl,
  cardImageUrl,
} from "../cardArt.js";
import { cardLabel } from "../cardUtil.js";

const EXT = [0, 1, 2, 3] as const;

function urlFor(
  back: boolean,
  cardId: string,
  ext: number,
): string {
  return back ? cardBackImageUrl(ext) : cardImageUrl(cardId, ext);
}

export type CardFaceSize = "sm" | "md" | "lg" | "xs";

const sizeClass: Record<CardFaceSize, string> = {
  xs: "card-face--xs",
  sm: "card-face--sm",
  md: "card-face--md",
  lg: "card-face--lg",
};

type Props = {
  cardId: string;
  size?: CardFaceSize;
  className?: string;
  back?: boolean;
  alt?: string;
  setNodeRef?: (node: HTMLDivElement | null) => void;
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLDivElement>, "style">;

/**
 * Renders a card using `/public/cards/{id}.png` (or .webp, .jpg). Falls back
 * to a text label if the image is missing.
 */
export function CardFace({
  cardId,
  size = "md",
  className = "",
  back = false,
  alt,
  setNodeRef,
  style,
  ...rest
}: Props) {
  const [extIndex, setExtIndex] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  const label = useMemo(() => cardLabel(cardId), [cardId]);

  const onImgError = useCallback(() => {
    const next = extIndex + 1;
    if (next < EXT.length) {
      setExtIndex(next);
    } else {
      setUseFallback(true);
    }
  }, [extIndex]);

  const src = urlFor(back, cardId, extIndex);

  return (
    <div
      ref={setNodeRef}
      className={`card-face ${sizeClass[size]} ${className}`.trim()}
      style={style}
      data-card-id={back ? "back" : cardId}
      {...rest}
    >
      {useFallback ? (
        <div className="card-face__fallback" aria-label={alt ?? label}>
          {back ? "?" : label}
        </div>
      ) : (
        <img
          key={src}
          className="card-face__img"
          src={src}
          alt={alt ?? (back ? "Card back" : label)}
          draggable={false}
          onError={onImgError}
        />
      )}
    </div>
  );
}
