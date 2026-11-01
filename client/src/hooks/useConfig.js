import { useEffect, useState } from 'react';
import { getConfig } from '../api.js';

const fallback = { codeLength: 4, maxAttempts: 5, maxFileMb: 10 };
let cached = null;

export function useConfig() {
  const [config, setConfig] = useState(cached || fallback);
  useEffect(() => {
    if (cached) return;
    getConfig()
      .then((c) => {
        cached = c;
        setConfig(c);
      })
      .catch(() => {});
  }, []);
  return config;
}
