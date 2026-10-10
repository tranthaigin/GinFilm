import { useState, useCallback } from 'react';
import { buildSeatMap } from '../api/mocks/booking';
import { getPairSeatId } from '../../user/components/booking/SeatMatrix';

export function useTheaterSeats() {
  const [seatMap] = useState(() => buildSeatMap());
  const [lockedSeatIds, setLockedSeatIds] = useState(new Set());

  const handleToggleSeat = useCallback((seatId) => {
    setLockedSeatIds((prev) => {
      const next = new Set(prev);
      const pairSeatId = getPairSeatId(seatId);
      
      if (next.has(seatId)) {
        next.delete(seatId);
        if (pairSeatId) next.delete(pairSeatId);
      } else {
        next.add(seatId);
        if (pairSeatId) next.add(pairSeatId);
      }
      return next;
    });
  }, []);

  return { seatMap, lockedSeatIds, onToggleSeat: handleToggleSeat };
}
