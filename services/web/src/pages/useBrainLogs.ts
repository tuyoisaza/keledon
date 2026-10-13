import { useState } from 'react';

const BRAIN_LOG_MAX = 200;

export function useBrainLogs() {
  const [brainLogs, setBrainLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log('[Brain]', msg);
    setBrainLogs((previous) => [entry, ...previous].slice(0, BRAIN_LOG_MAX));
  }

  return { brainLogs, setBrainLogs, addLog };
}
