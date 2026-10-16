import { useEffect, useState } from 'react';

// Derive remaining time from an absolute deadline so background tabs do not
// extend a booking when browsers throttle interval callbacks.
export function useCountdown(expiresAt, fallbackSeconds = 600) {
  const [fallbackDeadline] = useState(
    () => Date.now() + fallbackSeconds * 1000
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const deadline = expiresAt ? new Date(expiresAt).getTime() : fallbackDeadline;
  return Number.isFinite(deadline)
    ? Math.max(0, Math.ceil((deadline - now) / 1000))
    : 0;
}
