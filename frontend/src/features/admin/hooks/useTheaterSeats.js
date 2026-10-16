import { useState, useCallback } from 'react';
import { useShowSeats } from '../../user/hooks/useShowSeats';

export function useTheaterSeats(showtimeId) {
  const { seatMap, loading, error } = useShowSeats(showtimeId);
  const [lockedSeatIds, setLockedSeatIds] = useState(new Set());

  const handleToggleSeat = useCallback((seatId) => {
    setLockedSeatIds((prev) => {
      const next = new Set(prev);

      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
      }
      return next;
    });
  }, []);

  return { seatMap, loading, error, lockedSeatIds, onToggleSeat: handleToggleSeat };
}
