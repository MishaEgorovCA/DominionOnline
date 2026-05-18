const COLOR_CLASS: Record<string, string> = {
  Red: "red-token",
  Blue: "blue-token",
  Green: "green-token",
  White: "white-token",
  Brown: "brown-token",
  Gold: "gold-token",
};

type Props = {
  color: string;
  count: number;
  bonus?: number;
};

export function TokenChip({ color, count, bonus }: Props) {
  const cls = COLOR_CLASS[color] ?? "white-token";
  return (
    <div className="bonus-container">
      {bonus != null ? (
        <div className="bonus-icon">
          <span>{bonus}</span>
        </div>
      ) : null}
      <div className={`board-token ${cls}`}>
        <span>{count}</span>
      </div>
    </div>
  );
}
