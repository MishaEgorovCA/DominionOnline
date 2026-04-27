import { useCallback, useEffect, useRef, useState } from "react";

export type WsMsg = {
  type: string;
  room?: unknown;
  gameView?: unknown;
  you?: string;
  message?: string;
};

export type RoomSocketStatus = "idle" | "connecting" | "open" | "reconnecting";

function buildWsUrl(roomId: string, playerId: string, name: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}/ws?room=${encodeURIComponent(roomId)}&player=${encodeURIComponent(playerId)}&name=${encodeURIComponent(name)}`;
}

/**
 * Stable WebSocket for a room: reconnects with exponential backoff on drop.
 * `name` is read from a ref on each connect so renames do not recreate the socket,
 * but reconnects still send the latest display name in the query string.
 */
export function useRoomWebSocket(
  roomId: string,
  playerId: string | null,
  name: string,
  onMessage: (msg: WsMsg) => void,
): { send: (obj: object) => void; status: RoomSocketStatus } {
  const wsRef = useRef<WebSocket | null>(null);
  const nameRef = useRef(name);
  nameRef.current = name;

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [status, setStatus] = useState<RoomSocketStatus>("idle");

  const send = useCallback((obj: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }, []);

  useEffect(() => {
    if (!roomId || !playerId) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    function connect() {
      if (cancelled || !playerId) return;
      setStatus("connecting");
      const url = buildWsUrl(roomId, playerId, nameRef.current);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (cancelled) return;
        attempt = 0;
        setStatus("open");
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WsMsg;
          onMessageRef.current(msg);
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (cancelled) return;
        setStatus("reconnecting");
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        if (cancelled) return;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      const w = wsRef.current;
      wsRef.current = null;
      w?.close();
    };
  }, [roomId, playerId]);

  return { send, status };
}
