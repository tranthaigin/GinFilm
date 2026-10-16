import { useCallback, useMemo } from 'react';
import { useAsync } from './useAsync';
import { getShowSeats } from '../api/services/showService';

/**
 * Hook lấy thông tin suất chiếu và sơ đồ ghế thực tế từ backend.
 * Backend trả về: { show: { id, movieId, movieTitle, moviePosterUrl,
 *   theaterId, theaterName, theaterAddress, roomId, roomName,
 *   showDate, startTime, endTime, format }, seats: [...] }
 *
 * @param {number|string} [showId]
 */
export function useShowSeats(showId = 1) {
  const fetcher = useCallback(() => getShowSeats(showId), [showId]);
  const { data, loading, error, refetch } = useAsync(fetcher);

  /**
   * seatMap: Map<seatId, seat>
   * seatId được tạo từ rowSymbol + seatNumber (VD: "A13", "B5", "J2")
   */
  const seatMap = useMemo(() => {
    if (!data?.seats) return new Map();
    return new Map(
      data.seats.map((seat) => [
        `${seat.rowSymbol}${seat.seatNumber}`,
        seat,
      ])
    );
  }, [data]);

  /**
   * rows: danh sách hàng ghế đã được group và sort.
   * Mỗi hàng: { rowSymbol: 'A', seats: [{ seatNumber, seatType, status, id }, ...] }
   */
  const rows = useMemo(() => {
    if (!data?.seats) return [];
    const grouped = {};
    data.seats.forEach((seat) => {
      if (!grouped[seat.rowSymbol]) grouped[seat.rowSymbol] = [];
      grouped[seat.rowSymbol].push(seat);
    });
    // Sort hàng theo thứ tự chữ cái, seat trong hàng sort theo seatNumber giảm dần (Right-to-Left như admin)
    return Object.keys(grouped)
      .sort()
      .map((rowSymbol) => ({
        rowSymbol,
        seats: grouped[rowSymbol].sort((a, b) => b.seatNumber - a.seatNumber),
      }));
  }, [data]);

  return {
    show: data?.show ?? null,
    seats: data?.seats ?? [],
    rows,
    seatMap,
    loading,
    error,
    refetch,
  };
}
