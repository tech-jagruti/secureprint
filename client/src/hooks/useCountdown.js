import { useEffect, useRef, useState } from 'react';

// Returns milliseconds left until `expiresAt`. Calls onExpire once when it hits zero.
export function useCountdown(expiresAt, onExpire) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        onExpireRef.current?.();
      }
    };
    const id = setInterval(tick, 500);
    tick();
    return () => clearInterval(id);
  }, [expiresAt]);

  return left;
}

export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}
