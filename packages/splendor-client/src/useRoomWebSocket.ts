import { useCallback, useEffect, useRef, useState } from "react";

export type WsMsg = {
  type: string;
  room?: unknown;
  gameView?: unknown;
  you?: string;
  validActions?: string[];
  message?: string;
};

export type RoomSocketStatus = "idle" | "connecting" | "open" | "reconnecting";

function buildWsUrl(roomId: string, playerId: string, name: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}/ws/splendor?room=${encodeURIComponent(roomId)}&player=${encodeURIComponent(playerId)}&name=${encodeURIComponent(name)}`;
}

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
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
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
      const ws = new WebSocket(buildWsUrl(roomId, playerId, nameRef.current));
      ws.onopen = () => {
        if (cancelled) return;
        attempt = 0;
        setStatus("open");
      };
      ws.onmessage = (ev) => {
        try {
          onMessageRef.current(JSON.parse(String(ev.data)) as WsMsg);
        } catch {
          /* ignore */
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
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [roomId, playerId]);

  return { send, status };
}
