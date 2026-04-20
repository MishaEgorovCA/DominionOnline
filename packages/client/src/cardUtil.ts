import { getCard } from "@dominion/engine";

export function cardLabel(id: string): string {
  try {
    return getCard(id as never).name;
  } catch {
    return id;
  }
}
