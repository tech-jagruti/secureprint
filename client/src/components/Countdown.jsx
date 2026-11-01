import { useRef } from 'react';
import { formatClock, useCountdown } from '../hooks/useCountdown.js';

export default function Countdown({ expiresAt, onExpire, label = 'Deletes in' }) {
  const total = useRef(Math.max(expiresAt - Date.now(), 1));
  const left = useCountdown(expiresAt, onExpire);
  const pct = Math.min(100, (left / total.current) * 100);
  const low = left < 60_000;

  return (
    <div className={`countdown ${low ? 'is-low' : ''}`}>
      <div className="countdown__row">
        <span>{label}</span>
        <strong>{formatClock(left)}</strong>
      </div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
