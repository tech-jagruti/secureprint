import { config } from '../config.js';
import { sweep } from './jobService.js';

export function startCleanup() {
  const tick = () => sweep().catch((err) => console.error('[cleanup] sweep error:', err));
  tick();
  return setInterval(tick, config.cleanupIntervalMs);
}
