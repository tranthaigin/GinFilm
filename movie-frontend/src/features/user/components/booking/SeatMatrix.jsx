import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Panzoom from '@panzoom/panzoom';
import { LOGO_URL as SoldSeatLogo } from '../../../../shared/constants/brand';

export const getSeatType = (seatType) => {
  if (!seatType) return 'normal';
  const t = seatType.toUpperCase();
  if (t === 'NORMAL') return 'normal';
  if (t === 'VIP') return 'vip';
  if (t === 'COUPLE') return 'couple';
  if (t === 'BED') return 'bed';
  return 'normal';
};

export const PRICES = {
  normal: 75000,
  vip: 90000,
  couple: 120000,
  bed: 150000,
};

const SEAT_W = 36;    // px — chiều rộng mỗi ghế
const SEAT_H = 28;    // px — chiều cao mỗi ghế
const ROW_GAP = 7;    // px — khoảng cách giữa các hàng
const COL_GAP = 7;    // px — khoảng cách giữa các cột
const COUPLE_W = SEAT_W * 2 + COL_GAP;
const AISLE_SLOT_W = SEAT_W; // px — bằng SEAT_W để ghế đôi tại lối đi khít vừa [aisle(36)+gap(7)+seat(36)=COUPLE_W]
const ROW_LABEL_W = 24;  // px

const getEmbedUrl = (url) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    let videoId = '';
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube')) {
      videoId = urlObj.searchParams.get('v')
        || urlObj.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1]
        || '';
    }
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
      : url;
  } catch {
    return url;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

import React, { Component } from 'react';

class SeatMatrixErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('SeatMatrix Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-900 text-white font-mono rounded-lg">
          <h2 className="text-xl font-bold">SeatMatrix Crash!</h2>
          <p className="mt-4 whitespace-pre-wrap">{this.state.error?.toString()}</p>
          <pre className="mt-2 text-sm text-red-200">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function SeatMatrixInner({ rows: initialRows = [], seatMap, selectedIds, onToggle, occupiedIds = new Set(), pendingIds = new Set(), show, hideScreen = false, compactScreen = false, initialScale = 1, forceInitialScale = false }) {
  const dragAction = useRef(null); // 'select' or 'deselect'
  const dragStartSeatId = useRef(null);
  const hasDragged = useRef(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      dragAction.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const rows = useMemo(() => {
    if (!initialRows || !Array.isArray(initialRows)) return [];
    return [...initialRows].sort((a, b) => {
      const symbolA = String(a?.rowSymbol || '');
      const symbolB = String(b?.rowSymbol || '');
      if (symbolA.length !== symbolB.length) {
        return symbolA.length - symbolB.length;
      }
      return symbolA.localeCompare(symbolB);
    });
  }, [initialRows]);

  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setIsPlayingTrailer(false);
    setIsVideoPaused(false);
    setPosterFailed(false);
  }, [show?.id, show?.moviePosterUrl, show?.movieTrailerUrl]);

  // ── Panzoom: luôn bật cho khu vực ghế ────────────────────────
  const panzoomRef = useRef(null);
  const panzoomInst = useRef(null);
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);

  const matrixWidth = useMemo(() => {
    if (show?.room?.matrixWidth) return show.room.matrixWidth;
    if (show?.roomMatrixWidth) return show.roomMatrixWidth;
    if (show?.matrixWidth) return show.matrixWidth;

    let max = 0;
    rows.forEach(r => {
      r.seats.forEach(s => {
        const col = s.columnIndex !== undefined && s.columnIndex !== null ? s.columnIndex : s.seatNumber;
        const seatWidth = s.seatType?.toUpperCase() === 'COUPLE' ? 2 : 1;
        if (col + seatWidth - 1 > max) max = col + seatWidth - 1;
      });
    });
    return max >= 0 ? max + 1 : 15;
  }, [show, rows]);

  const matrixHeight = useMemo(() => {
    if (show?.room?.matrixHeight) return show.room.matrixHeight;
    if (show?.roomMatrixHeight) return show.roomMatrixHeight;
    if (show?.matrixHeight) return show.matrixHeight;

    let maxR = 0;
    rows.forEach(r => {
      const rowIndex = r.seats[0]?.rowIndex;
      if (rowIndex !== undefined && rowIndex !== null && rowIndex > maxR) {
        maxR = rowIndex;
      }
    });
    return maxR > 0 ? maxR + 1 : Math.max(10, rows.length);
  }, [show, rows]);

  const seatBounds = useMemo(() => {
    let minR = 999;
    let maxR = 0;
    rows.forEach(r => {
      const rowIndex = r.seats[0]?.rowIndex;
      if (rowIndex !== undefined && rowIndex !== null) {
        if (rowIndex < minR) minR = rowIndex;
        if (rowIndex > maxR) maxR = rowIndex;
      }
    });
    return { minR: minR === 999 ? 0 : minR, maxR };
  }, [rows]);

  const isSmallRoom = rows.length <= 10 && matrixWidth <= 18;

  const toggleVideoPlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPaused(false);
      } else {
        videoRef.current.pause();
        setIsVideoPaused(true);
      }
    }
  }, []);

  useEffect(() => {
    const el = panzoomRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    const contentWidth = el.scrollWidth;
    const contentHeight = el.scrollHeight;

    let computedScale = initialScale;

    const overflows = contentWidth > wrapperWidth || contentHeight > wrapperHeight;

    if (overflows) {
      const fitScaleW = (wrapperWidth - 40) / contentWidth;
      const fitScaleH = (wrapperHeight - 40) / contentHeight;
      const fitScale = Math.min(fitScaleW, fitScaleH);

      if (forceInitialScale) {
        computedScale = initialScale;
      } else {
        computedScale = Math.min(initialScale, Math.max(0.2, fitScale));
      }
    }

    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const defaultDisablePan = forceInitialScale ? false : (isTouchDevice ? (isSmallRoom && !overflows && !compactScreen) : true);
    const defaultCursor = forceInitialScale ? 'grab' : (isTouchDevice ? ((isSmallRoom && !overflows && !compactScreen) ? 'default' : 'grab') : 'default');

    const pzInstance = Panzoom(el, {
      maxScale: 3,
      minScale: 0.2,
      cursor: defaultCursor,
      excludeClass: 'seat-btn',
      step: 0.15,
      startScale: computedScale,
      startX: 0,
      startY: 0,
      canvas: true,
      disablePan: defaultDisablePan,
      disableZoom: (isSmallRoom && !overflows && !compactScreen),
    });
    panzoomInst.current = pzInstance;

    const wheelHandler = (e) => {
      if (isPlayingTrailer) return;

      if (isSmallRoom && !overflows && !compactScreen) {
        return; // Normal scroll if small room fits perfectly
      }

      if (isZPressed.current) {
        e.preventDefault();
        pzInstance.zoomWithWheel(e);
      }
    };
    wrapper.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      wrapper.removeEventListener('wheel', wheelHandler);
      pzInstance.destroy();
      panzoomInst.current = null;
    };
  }, [isPlayingTrailer, isSmallRoom]);

  const zoomIn = useCallback(() => panzoomInst.current?.zoomIn(), []);
  const zoomOut = useCallback(() => panzoomInst.current?.zoomOut(), []);
  const zoomReset = useCallback(() => panzoomInst.current?.reset(), []);
  // ─────────────────────────────────────────────────────────────

  // Track Z key for zooming, X key for panning
  const isZPressed = useRef(false);
  const isXPressed = useRef(false);

  useEffect(() => {
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'z') {
        isZPressed.current = true;
      }
      if (e.key.toLowerCase() === 'x') {
        isXPressed.current = true;
        if (panzoomInst.current && !isTouchDevice) {
          panzoomInst.current.setOptions({ disablePan: false, cursor: 'grab' });
        }
      }
    };
    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'z') {
        isZPressed.current = false;
      }
      if (e.key.toLowerCase() === 'x') {
        isXPressed.current = false;
        if (panzoomInst.current && !isTouchDevice) {
          panzoomInst.current.setOptions({ disablePan: true, cursor: 'default' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const displayOccupiedIds = useMemo(() => {
    return new Set(occupiedIds);
  }, [occupiedIds, rows]);

  const { totalWidth } = useMemo(() => {
    const occupiedCols = new Set();
    const normalRows = rows.filter(r => !r.seats.some(s => s.seatType?.toUpperCase() === 'COUPLE'));
    const rowsToUse = normalRows.length > 0 ? normalRows : rows;

    rowsToUse.forEach(r => {
      r.seats.forEach(s => {
        const c = s.columnIndex !== undefined && s.columnIndex !== null ? s.columnIndex : matrixWidth - s.seatNumber;
        occupiedCols.add(c);
        if (s.seatType?.toUpperCase() === 'COUPLE') {
          occupiedCols.add(c + 1);
        }
      });
    });

    const ranges = [];
    let currentStart = -1;
    for (let c = 0; c < matrixWidth; c++) {
      if (!occupiedCols.has(c)) {
        if (currentStart === -1) currentStart = c;
      } else {
        if (currentStart !== -1) {
          ranges.push({ start: currentStart, end: c - 1 });
          currentStart = -1;
        }
      }
    }
    if (currentStart !== -1) {
      ranges.push({ start: currentStart, end: matrixWidth - 1 });
    }

    const width = matrixWidth * SEAT_W + Math.max(0, matrixWidth - 1) * COL_GAP;
    return { totalWidth: width };
  }, [rows, matrixWidth]);

  const { rowOffsets, totalHeight, diagonalAisles, verticalAisles, emptyCellsArr, seatMinR, seatMaxR, seatMinC, seatMaxC } = useMemo(() => {
    const rowOffsets = [];
    let currentY = 0;

    // Kiểm tra xem dữ liệu có rowIndex không
    const hasRowIndex = rows.length > 0 && rows[0].seats[0]?.rowIndex !== undefined && rows[0].seats[0]?.rowIndex !== null;

    const rowsByIndex = {};
    let minActualRowR = Infinity;
    let maxActualRowR = -Infinity;
    let minActualColC = Infinity;
    let maxActualColC = -Infinity;
    rows.forEach((r, idx) => {
      const rowIndex = hasRowIndex ? r.seats[0]?.rowIndex : idx;
      if (rowIndex !== undefined && rowIndex !== null) {
        rowsByIndex[rowIndex] = r;
        if (rowIndex < minActualRowR) minActualRowR = rowIndex;
        if (rowIndex > maxActualRowR) maxActualRowR = rowIndex;
      }
      r.seats.forEach(s => {
        const colIndex = s.columnIndex !== undefined && s.columnIndex !== null ? s.columnIndex : s.seatNumber;
        if (colIndex < minActualColC) minActualColC = colIndex;
        if (colIndex > maxActualColC) maxActualColC = colIndex;
      });
    });

    let prevHasCouple = false;
    for (let r = 0; r < matrixHeight; r++) {
      const row = rowsByIndex[r];
      const hasCouple = row ? row.seats.some(s => s.seatType?.toUpperCase() === 'COUPLE') : false;
      const extraMargin = (hasCouple && !prevHasCouple && r > 0) ? 20 : 0;
      currentY += extraMargin;

      rowOffsets.push({ y: currentY, extraMargin });

      currentY += SEAT_H + ROW_GAP;
      if (row) {
        prevHasCouple = hasCouple;
      }
    }
    const emptyCells = new Set();
    for (let r = 0; r < matrixHeight; r++) {
      for (let c = 0; c < matrixWidth; c++) {
        emptyCells.add(`${r},${c}`);
      }
    }
    rows.forEach((r, idx) => {
      r.seats.forEach(s => {
        const rowIndex = hasRowIndex ? s.rowIndex : idx;
        const colIndex = s.columnIndex !== undefined && s.columnIndex !== null ? s.columnIndex : s.seatNumber;
        emptyCells.delete(`${rowIndex},${colIndex}`);
        if (s.seatType?.toUpperCase() === 'COUPLE') {
          emptyCells.delete(`${rowIndex},${colIndex + 1}`);
        }
      });
    });

    const aisles = [];
    const visited1 = new Set();
    for (let r = 0; r < matrixHeight; r++) {
      for (let c = 0; c < matrixWidth; c++) {
        if (emptyCells.has(`${r},${c}`) && !visited1.has(`${r},${c}`)) {
          let tr = r;
          let tc = c;
          let segment = [];
          while (emptyCells.has(`${tr},${tc}`)) {
            visited1.add(`${tr},${tc}`);
            segment.push({ r: tr, c: tc });
            tr++;
            tc++;
          }
          let minDiagLength = Math.max(5, Math.floor(Math.min(matrixHeight, matrixWidth) * 0.6));
          if (segment.length >= minDiagLength) {
            aisles.push({ type: 'down-right', cells: segment });
          }
        }
      }
    }

    const visited2 = new Set();
    for (let r = 0; r < matrixHeight; r++) {
      for (let c = matrixWidth - 1; c >= 0; c--) {
        if (emptyCells.has(`${r},${c}`) && !visited2.has(`${r},${c}`)) {
          let tr = r;
          let tc = c;
          let segment = [];
          while (emptyCells.has(`${tr},${tc}`)) {
            visited2.add(`${tr},${tc}`);
            segment.push({ r: tr, c: tc });
            tr++;
            tc--;
          }
          let minDiagLength = Math.max(5, Math.floor(Math.min(matrixHeight, matrixWidth) * 0.6));
          if (segment.length >= minDiagLength) {
            aisles.push({ type: 'down-left', cells: segment });
          }
        }
      }
    }

    const diagonalGroups = [];
    aisles.forEach(a => {
      let addedToGroup = false;
      for (let group of diagonalGroups) {
        const isAdjacent = group.some(fa => {
          if (fa.type !== a.type) return false;
          const aStart = a.cells[0];
          const faStart = fa.cells[0];
          if (a.type === 'down-left') {
            return Math.abs((aStart.r + aStart.c) - (faStart.r + faStart.c)) <= 2;
          } else {
            return Math.abs((aStart.r - aStart.c) - (faStart.r - faStart.c)) <= 2;
          }
        });
        if (isAdjacent) {
          group.push(a);
          addedToGroup = true;
          break;
        }
      }
      if (!addedToGroup) {
        diagonalGroups.push([a]);
      }
    });
    const diagonalAisles = diagonalGroups;

    const verticalAisles = [];
    // Lối dọc chạy hết hàng ghế thường cuối cùng. Nếu cuối phòng có một
    // hoặc nhiều hàng ghế đôi liên tiếp, lối đi dừng trước cả cụm ghế đôi.
    const verticalStartR = Number.isFinite(minActualRowR) ? minActualRowR : 0;
    let verticalEndR = Number.isFinite(maxActualRowR)
      ? maxActualRowR
      : Math.max(0, matrixHeight - 1);
    while (
      verticalEndR > verticalStartR
      && rowsByIndex[verticalEndR]?.seats.some(s => s.seatType?.toUpperCase() === 'COUPLE')
    ) {
      verticalEndR--;
    }
    let currentStartC = -1;
    for (let c = 0; c < matrixWidth; c++) {
      let isColEmpty = true;
      for (let r = verticalStartR; r <= verticalEndR; r++) {
        if (!emptyCells.has(`${r},${c}`)) {
          isColEmpty = false;
          break;
        }
      }
      if (isColEmpty) {
        if (currentStartC === -1) currentStartC = c;
      } else {
        if (currentStartC !== -1) {
          verticalAisles.push({
            startC: currentStartC,
            endC: c - 1,
            startR: verticalStartR,
            endR: verticalEndR
          });
          currentStartC = -1;
        }
      }
    }
    if (currentStartC !== -1) {
      verticalAisles.push({
        startC: currentStartC,
        endC: matrixWidth - 1,
        startR: verticalStartR,
        endR: verticalEndR
      });
    }

    // Dải trống ở giữa hai khu ghế tạo hai lối đi sát ghế.
    // Các cột dư ở giữa được nén thành một khoảng đệm nhỏ khi hiển thị.
    const normalizedVerticalAisles = verticalAisles.flatMap((aisle, sourceIndex) => {
      const withMeta = range => ({
        ...range,
        sourceIndex,
        isEdgeAisle: aisle.startC === 0 || aisle.endC === matrixWidth - 1
      });

      if (aisle.startC === aisle.endC) {
        return [withMeta(aisle)];
      }

      if (aisle.startC === 0) {
        return [withMeta({ ...aisle, startC: aisle.endC })];
      }
      if (aisle.endC === matrixWidth - 1) {
        return [withMeta({ ...aisle, endC: aisle.startC })];
      }
      if (aisle.endC - aisle.startC + 1 === 2) {
        return [withMeta(aisle)];
      }
      return [
        withMeta({ ...aisle, endC: aisle.startC }),
        withMeta({ ...aisle, startC: aisle.endC })
      ];
    });

    // Mỗi vùng lối đi có thể phục vụ hai khu ghế sát hai phía. Giữ các
    // lối ngoài cùng trước, rồi chỉ thêm lối khi cặp khu ghế kế tiếp chưa
    // được một lối đã chọn phục vụ. Kết quả là chuỗi lối đi xen kẽ tối thiểu.
    const selectedSources = new Set();
    verticalAisles.forEach((aisle, sourceIndex) => {
      if (aisle.startC === 0 || aisle.endC === matrixWidth - 1) {
        selectedSources.add(sourceIndex);
      }
    });

    // When the matrix has seats at an outer edge, the first/last real empty
    // strip is the only aisle that can serve that outer seat block. Keep it
    // before optimizing the inner strips. A configured door does not affect
    // this decision; only actual empty matrix columns do.
    if (verticalAisles.length > 0) {
      const hasLeftEdgeAisle = verticalAisles[0].startC === 0;
      const lastSourceIndex = verticalAisles.length - 1;
      const hasRightEdgeAisle = verticalAisles[lastSourceIndex].endC === matrixWidth - 1;

      if (!hasLeftEdgeAisle) selectedSources.add(0);
      if (!hasRightEdgeAisle) selectedSources.add(lastSourceIndex);
    }

    for (let sourceIndex = 0; sourceIndex < verticalAisles.length - 1; sourceIndex++) {
      const nextSourceIndex = sourceIndex + 1;
      if (!selectedSources.has(sourceIndex) && !selectedSources.has(nextSourceIndex)) {
        selectedSources.add(nextSourceIndex);
      }
    }

    const optimizedVerticalAisles = normalizedVerticalAisles
      .filter(aisle => selectedSources.has(aisle.sourceIndex))
      .sort((a, b) => a.startC - b.startC);
    const rawEmptyCells = Array.from(emptyCells).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { r, c };
    });

    const emptyCellsArr = rawEmptyCells.filter(cell =>
      cell.r >= minActualRowR &&
      cell.r <= maxActualRowR
    );

    const emptySet = new Set(emptyCellsArr.map(c => `${c.r},${c.c}`));
    emptyCellsArr.forEach(cell => {
      const hasTop = emptySet.has(`${cell.r - 1},${cell.c}`);
      const hasBottom = emptySet.has(`${cell.r + 1},${cell.c}`);
      const hasLeft = emptySet.has(`${cell.r},${cell.c - 1}`);
      const hasRight = emptySet.has(`${cell.r},${cell.c + 1}`);

      cell.radius = `${(!hasTop && !hasLeft) ? '12px' : '0px'} ${(!hasTop && !hasRight) ? '12px' : '0px'} ${(!hasBottom && !hasRight) ? '12px' : '0px'} ${(!hasBottom && !hasLeft) ? '12px' : '0px'}`;
    });

    return { rowOffsets, totalHeight: currentY - ROW_GAP, diagonalAisles, verticalAisles: optimizedVerticalAisles, emptyCellsArr, seatMinR: minActualRowR, seatMaxR: maxActualRowR, seatMinC: minActualColC, seatMaxC: maxActualColC };
  }, [rows, matrixHeight, matrixWidth]);

  const gridHeight = totalHeight;

  const lastRow = rows[rows.length - 1];
  const lastRowHasCouple = lastRow && lastRow.seats.some(s => s.seatType?.toUpperCase() === 'COUPLE');

  let aisleHeight = gridHeight;
  if (lastRowHasCouple) {
    let firstCoupleInGroup = rows.length - 1;
    while (firstCoupleInGroup > 0 && rows[firstCoupleInGroup - 1].seats.some(s => s.seatType?.toUpperCase() === 'COUPLE')) {
      firstCoupleInGroup--;
    }
    if (firstCoupleInGroup > 0) {
      const offsetIndex = rows[firstCoupleInGroup - 1].seats[0]?.rowIndex || firstCoupleInGroup - 1;
      aisleHeight = (rowOffsets[offsetIndex]?.y || 0) + SEAT_H;
    }
  }

  const innerWidth = totalWidth;
  const trailerUrl = show?.movieTrailerUrl || '';
  const trailerEmbedUrl = getEmbedUrl(trailerUrl);
  const isYouTubeTrailer = trailerEmbedUrl.includes('youtube.com/embed/');

  const parseAccessPositions = (positions, fallbackSide, fallbackOffset) => {
    const values = Array.isArray(positions) && positions.length > 0
      ? positions
      : [`${fallbackSide}:${fallbackOffset}`];
    return values.map((position, index) => {
      const [side, rawOffset] = String(position).split(':');
      return { side, offset: Number(rawOffset) || 0, index };
    });
  };

  const accessPoints = [
    ...parseAccessPositions(
      show?.entrancePositions,
      show?.entranceSide || 'LEFT',
      show?.entranceOffset ?? 0
    ).map(position => ({
      ...position,
      key: `entrance-${position.index}`,
      label: 'Lối vào',
      color: '#FFD700',
      textColor: '#000'
    })),
    ...parseAccessPositions(
      show?.exitPositions,
      show?.exitSide || 'RIGHT',
      show?.exitOffset ?? 0
    ).map(position => ({
      ...position,
      key: `exit-${position.index}`,
      label: 'Lối ra',
      color: '#00C853',
      textColor: '#fff'
    }))
  ].map(point => {
    const isVerticalSide = point.side === 'LEFT' || point.side === 'RIGHT';
    const maxOffset = Math.max(0, (isVerticalSide ? matrixHeight : matrixWidth) - 1);
    const offset = Math.min(Math.max(0, point.offset), maxOffset);
    const seatAreaLeft = ROW_LABEL_W + COL_GAP;

    if (point.side === 'TOP') {
      return { ...point, left: seatAreaLeft + offset * (SEAT_W + COL_GAP), top: -46 };
    }
    if (point.side === 'BOTTOM') {
      return { ...point, left: seatAreaLeft + offset * (SEAT_W + COL_GAP), top: gridHeight + 8 };
    }
    if (point.side === 'RIGHT') {
      return {
        ...point,
        left: seatAreaLeft + innerWidth + COL_GAP,
        top: (rowOffsets[offset]?.y || 0) - 22
      };
    }
    return {
      ...point,
      left: seatAreaLeft - SEAT_W - COL_GAP - 45,
      top: (rowOffsets[offset]?.y || 0) - 22
    };
  });

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#555] gap-3">
        <span className="material-symbols-outlined text-5xl">event_seat</span>
        <span className="text-sm">Đang tải sơ đồ ghế...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col rounded-2xl border border-transparent dark:border-white/10 overflow-hidden bg-[#FAFAFA] dark:bg-black/20">
      <style>{`
        @keyframes screen-poster-drift {
          0%, 100% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
        }
        @keyframes screen-media-in {
          from { opacity: 0; transform: scale(1.015); }
          to { opacity: 1; transform: scale(1); }
        }
        .screen-poster-strip {
          animation: screen-poster-drift 10s ease-in-out infinite;
        }
        .screen-media-in {
          animation: screen-media-in 300ms ease-out both;
        }
        .cinema-screen:hover .screen-poster-center img {
          transform: scale(1.08);
          filter: brightness(1.18) saturate(1.08);
        }
        .cinema-screen:hover .screen-red-glow {
          opacity: 1;
          box-shadow: 0 0 28px rgba(230, 26, 39, 0.95);
        }
        .vertical-aisle {
          background: linear-gradient(90deg, rgba(15,23,42,0.035), rgba(15,23,42,0.105) 50%, rgba(15,23,42,0.035));
          border: 1px solid rgba(15,23,42,0.16);
          box-shadow: inset 0 0 12px rgba(15,23,42,0.045), 0 2px 5px rgba(15,23,42,0.08);
        }
        .vertical-aisle-step {
          background: linear-gradient(90deg, transparent, rgba(15,23,42,0.28), transparent);
          box-shadow: 0 1px 1px rgba(255,255,255,0.75);
        }
        .dark .vertical-aisle {
          background: linear-gradient(90deg, rgba(255,255,255,0.018), rgba(255,255,255,0.045) 50%, rgba(255,255,255,0.018));
          border-color: rgba(255,255,255,0.08);
          box-shadow: inset 0 0 12px rgba(255,255,255,0.025);
        }
        .dark .vertical-aisle-step {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent);
          box-shadow: 0 1px 2px rgba(0,0,0,0.55);
        }
        .vertical-aisle-label {
          color: #111827;
          text-shadow: 0 1px 0 rgba(255,255,255,0.95);
        }
        .dark .vertical-aisle-label {
          color: rgba(255,255,255,0.85);
          text-shadow: 0 1px 3px rgba(0,0,0,0.9);
        }
        .access-door {
          background: rgba(15,23,42,0.055);
          border: 1px solid rgba(15,23,42,0.32);
          box-shadow: inset 0 0 7px rgba(15,23,42,0.06), 0 2px 5px rgba(15,23,42,0.1);
        }
        .access-door-divider {
          border-color: rgba(15,23,42,0.28);
        }
        .dark .access-door {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.38);
          box-shadow: inset 0 0 7px rgba(255,255,255,0.1), 0 0 7px rgba(255,255,255,0.12);
        }
        .dark .access-door-divider {
          border-color: rgba(255,255,255,0.3);
        }
        .light-selected-seat {
          transform: translateY(-2px) scale(1.04);
        }
        .dark .light-selected-seat {
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .screen-poster-strip, .screen-media-in {
            animation: none;
          }
          .screen-poster-tile img {
            transition: none !important;
          }
        }
      `}</style>

      {/* ══ MÀNG HÌNH — cố định, không zoom ══════════════════════ */}
      {!hideScreen && (
        <div className={`w-full px-6 pt-6 pb-0 flex flex-col items-center shrink-0 ${compactScreen ? 'scale-90 origin-top' : ''}`}>
          <div
            className="relative flex flex-col items-center mx-auto w-full"
            style={{
              maxWidth: Math.min(innerWidth + ROW_LABEL_W * 2 + COL_GAP * 2 + 120, 1000),
              perspective: '850px',
              transformStyle: 'preserve-3d'
            }}
          >
            <div
              className="cinema-screen w-full relative overflow-hidden rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 border-2 border-white/10"
              style={{
                height: compactScreen ? '140px' : '200px',
                transform: 'rotateX(-7deg) translateZ(0)',
                background: '#111',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              {isPlayingTrailer && trailerUrl ? (
                <div className="screen-media-in absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                  {isYouTubeTrailer ? (
                    <iframe
                      src={trailerEmbedUrl}
                      title={`Trailer ${show?.movieTitle || 'phim'}`}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={trailerUrl}
                      poster={!posterFailed ? show?.moviePosterUrl : undefined}
                      autoPlay
                      controls
                      playsInline
                      disablePictureInPicture
                      controlsList="nodownload noremoteplayback"
                      className="w-full h-full pointer-events-auto object-cover cursor-pointer outline-none select-none"
                      onClick={toggleVideoPlay}
                      onPause={() => setIsVideoPaused(true)}
                      onPlay={() => setIsVideoPaused(false)}
                      onEnded={() => setIsVideoPaused(true)}
                    />
                  )}
                  {!isYouTubeTrailer && isVideoPaused && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] select-none">
                        <span className="material-symbols-outlined text-white text-[32px] ml-1 select-none pointer-events-none">play_arrow</span>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPlayingTrailer(false)}
                    className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/65 text-white border border-white/20 flex items-center justify-center hover:bg-black/90 transition-colors"
                    title="Đóng trailer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ) : show?.moviePosterUrl && !posterFailed ? (
                <div className="relative w-full h-full overflow-hidden bg-black">
                  <img
                    src={show.moviePosterUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] object-cover opacity-35 blur-xl scale-110"
                    loading="lazy"
                    onError={() => setPosterFailed(true)}
                  />
                  <div className="absolute inset-0 bg-black/35" />
                  <div
                    className="screen-poster-strip relative z-[1] w-[calc(100%+10px)] flex items-stretch justify-center"
                    style={{ height: 'calc(100% - 4px)' }}
                  >
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`screen-poster-${index}`}
                        className={`screen-poster-tile ${index === 2 ? 'screen-poster-center' : ''} w-1/5 h-full flex items-center justify-center border-x border-white/[0.04]`}
                        style={{
                          opacity: index === 2 ? 1 : (index === 1 || index === 3 ? 0.78 : 0.52),
                          transform: index === 2 ? 'scale(1.045)' : (index === 1 || index === 3 ? 'scale(0.985)' : 'scale(0.95)'),
                          filter: index === 2 ? 'brightness(1.08)' : (index === 1 || index === 3 ? 'brightness(0.76)' : 'brightness(0.48)')
                        }}
                      >
                        <img
                          src={show.moviePosterUrl}
                          alt={index === 2 ? (show?.movieTitle || 'Poster phim') : ''}
                          aria-hidden={index !== 2}
                          className="w-full h-full object-contain transition-all duration-700 ease-out"
                          loading="lazy"
                          onError={() => setPosterFailed(true)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-0 bottom-1 left-0 z-[2] w-[13%] bg-gradient-to-r from-black/85 to-transparent pointer-events-none" />
                  <div className="absolute top-0 bottom-1 right-0 z-[2] w-[13%] bg-gradient-to-l from-black/85 to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-[#27272a] to-[#09090b] flex items-center justify-center">
                  <div className="text-center px-6">
                    <span className="material-symbols-outlined text-white/20 text-5xl">movie</span>
                    <p className="mt-2 text-sm font-bold text-white/45">{show?.movieTitle || 'Màn hình phòng chiếu'}</p>
                  </div>
                </div>
              )}

              {!isPlayingTrailer && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

                  <div
                    className={`absolute inset-0 flex items-center justify-center group ${trailerUrl ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => {
                      if (trailerUrl) setIsPlayingTrailer(true);
                    }}
                  >
                    {trailerUrl && (
                      <div className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-[0_0_18px_rgba(0,0,0,0.65)] group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-white text-[32px] ml-1">play_arrow</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="screen-red-glow absolute bottom-0 left-0 right-0 z-30 h-[3px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent shadow-[0_0_20px_#e61a27] opacity-80 transition-all duration-500 pointer-events-none" />
            </div>

            <span className="mt-2 text-[11px] font-black tracking-[0.5em] text-[#555] dark:text-white/50 uppercase">MÀN HÌNH</span>

            <div
              className="w-[90%] h-6 mt-1 blur-md"
              style={{ background: 'radial-gradient(ellipse at top, rgba(230,26,39,0.3), transparent 70%)' }}
            />
          </div>
        </div>
      )}

      {/* ══ PANZOOM WRAPPER — chỉ bao quanh khu vực ghế ══════════ */}
      <div
        ref={wrapperRef}
        className="relative overflow-hidden flex-1 min-h-[300px] flex flex-col items-center justify-center pb-8"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          touchAction: 'none',
          cursor: isSmallRoom ? 'default' : 'grab',
        }}
      >
        <div
          ref={panzoomRef}
          className="flex flex-col items-center w-fit h-fit pt-16 px-12 pb-8"
          style={{ transformOrigin: 'center center', touchAction: 'none', userSelect: 'none', willChange: 'transform' }}
        >
          {/* Khu vực ghế — relative để aisle overlay có thể vươn xuống toàn bộ chiều cao grid */}
          <div className="relative mx-auto" style={{ width: `${(ROW_LABEL_W + COL_GAP) * 2 + innerWidth}px`, height: `${gridHeight}px`, overflow: 'visible', marginTop: '48px' }}>
            {/* ── Lối vào / Lối ra do admin cấu hình trên viền phòng ── */}
            {accessPoints.map(point => (
              <div
                key={point.key}
                className="absolute flex items-center justify-center gap-1 pointer-events-none"
                style={{
                  left: `${point.left}px`,
                  top: `${point.top}px`,
                  zIndex: 20,
                  flexDirection: point.side === 'BOTTOM'
                    ? 'column-reverse'
                    : 'column'
                }}
              >
                <div
                  className="px-3 py-[2px] rounded text-[10px] font-bold whitespace-nowrap shadow-md"
                  style={{
                    backgroundColor: point.color,
                    color: point.textColor,
                    boxShadow: `0 0 9px ${point.color}55, 0 2px 5px rgba(0,0,0,0.65)`
                  }}
                >
                  {point.label}
                </div>
                <div
                  className="access-door flex rounded-t-md"
                  style={{
                    width: '40px',
                    height: '16px',
                    borderBottomWidth: 0,
                  }}
                >
                  <div className="access-door-divider w-1/2 border-r" />
                  <div className="w-1/2" />
                </div>
              </div>
            ))}

            {/* ── Lối đi chéo ── */}
            {diagonalAisles && diagonalAisles.map((group, idx) => {
              let totalMidX = 0, totalMidY = 0, maxLength = 0, angle = 0;

              group.forEach(aisle => {
                let validCells = aisle.cells.filter(cell => cell.r >= seatMinR && cell.r <= seatMaxR && cell.c >= seatMinC && cell.c <= seatMaxC);
                if (validCells.length === 0) validCells = aisle.cells;

                const startCell = validCells[0];
                const endCell = validCells[validCells.length - 1];

                const startX = ROW_LABEL_W + COL_GAP + startCell.c * (SEAT_W + COL_GAP) + (SEAT_W / 2);
                const startY = (rowOffsets[startCell.r]?.y || 0) + (SEAT_H / 2);

                const endX = ROW_LABEL_W + COL_GAP + endCell.c * (SEAT_W + COL_GAP) + (SEAT_W / 2);
                const endY = (rowOffsets[endCell.r]?.y || 0) + (SEAT_H / 2);

                totalMidX += (startX + endX) / 2;
                totalMidY += (startY + endY) / 2;

                let a = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
                if (a > 90) a -= 180;
                else if (a < -90) a += 180;
                angle = a;

                const len = Math.hypot(endX - startX, endY - startY) + SEAT_W;
                if (len > maxLength) maxLength = len;
              });

              const midX = totalMidX / group.length;
              const midY = totalMidY / group.length;
              const length = maxLength;

              return null;
            })}

            {/* ── Lối đi dọc ── */}
            {verticalAisles && verticalAisles.map((aisle, idx) => {
              const numColsInGroup = aisle.endC - aisle.startC + 1;
              const leftPos = ROW_LABEL_W + COL_GAP + aisle.startC * (SEAT_W + COL_GAP) - COL_GAP / 2;
              const topPos = rowOffsets[aisle.startR]?.y;
              if (topPos === undefined) return null;

              const width = numColsInGroup * SEAT_W + numColsInGroup * COL_GAP;
              
              const endRowData = rows.find(r => r.seats.some(s => (s.rowIndex !== undefined && s.rowIndex !== null ? s.rowIndex : rows.indexOf(r)) === aisle.endR));
              const hasBedInAisleEnd = endRowData?.seats.some(s => s.seatType?.toLowerCase() === 'bed');
              const height = (rowOffsets[aisle.endR]?.y || 0) - topPos + (hasBedInAisleEnd ? 65 : SEAT_H);

              const rowIndices = [];
              for (let r = aisle.startR; r <= aisle.endR; r++) {
                if (rowOffsets[r] !== undefined) rowIndices.push(r);
              }

              return (
                <div
                  key={`v-aisle-${idx}`}
                  className="vertical-aisle absolute flex items-center justify-center pointer-events-none overflow-hidden"
                  style={{
                    left: `${leftPos}px`,
                    top: `${topPos}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    borderRadius: '8px',
                    zIndex: 0
                  }}
                >
                  {rowIndices.map(r => {
                    const lineY = rowOffsets[r].y - topPos + SEAT_H / 2;
                    return (
                      <div
                        key={`vline-${r}`}
                        className="vertical-aisle-step absolute h-[2px]"
                        style={{
                          top: `${lineY}px`,
                          left: '8%',
                          width: '84%',
                        }}
                      ></div>
                    );
                  })}
                  {(aisle.endR - aisle.startR + 1 >= 3) && (
                    <span
                      className="vertical-aisle-label relative z-10"
                      style={{
                        fontWeight: 900,
                        fontSize: '14px',
                        letterSpacing: '6px',
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        whiteSpace: 'nowrap',
                        userSelect: 'none'
                      }}
                    >
                      LỐI ĐI
                    </span>
                  )}
                </div>
              );
            })}

            {/* ── Removed Empty slots (Backgrounds for straight aisles) ── */}

            <div className="absolute top-0 left-0 w-full h-full">
              {rows.map(({ rowSymbol, seats }, rowIdx) => {
                // Map seatNumber → seat object cho hàng này
                const rowSeatMap = new Map(seats.map((s) => [s.seatNumber, s]));

                const hasRowIdx = rows.length > 0 && seats[0]?.rowIndex !== undefined && seats[0]?.rowIndex !== null;
                const actualRowIndex = hasRowIdx ? seats[0]?.rowIndex : rowIdx;
                const topPos = rowOffsets[actualRowIndex]?.y !== undefined ? rowOffsets[actualRowIndex].y : 0;

                return (
                  <div key={rowSymbol} className="absolute flex items-center" style={{ top: `${topPos}px`, left: 0, gap: COL_GAP }}>
                    {/* Label trái */}
                    <div
                      className="font-bold text-[13px] text-[#555] flex items-center justify-center select-none shrink-0"
                      style={{ width: ROW_LABEL_W, height: SEAT_H }}
                    >
                      {rowSymbol}
                    </div>

                    {/* Ghế + lối đi */}
                    <div className="relative shrink-0" style={{ width: innerWidth, height: SEAT_H }}>
                      {/* ── Ghế: absolute positioned theo matrixWidth ── */}
                      {seats.map((seat, ci) => {
                        const c = seat.columnIndex !== undefined && seat.columnIndex !== null ? seat.columnIndex : matrixWidth - seat.seatNumber;
                        const leftPos = c * (SEAT_W + COL_GAP);

                        const seatId = `${seat.rowSymbol}${seat.seatNumber}`;
                        // Sử dụng chính xác seatNumber từ database để đồng bộ với vé
                        const displayId = `${seat.rowSymbol}${seat.seatNumber}`;

                        const type = getSeatType(seat.seatType);
                        const isCouple = type === 'couple';
                        const isBed = type === 'bed';

                        const isOccupied = occupiedIds?.has(seatId) || pendingIds?.has(seatId) || seat.status === 'BROKEN' || seat.status === 'BOOKED' || seat.status === 'SOLD' || seat.status === 'RESERVED';
                        const isSelected = selectedIds.has(seatId);

                        const seatWidth = isCouple ? COUPLE_W : SEAT_W;
                        const seatHeight = isBed ? 65 : SEAT_H;

                        let seatClasses = '';
                        let extraBorderRadius = '6px';
                        if (isCouple) extraBorderRadius = '12px 12px 4px 4px';

                        if (isOccupied) {
                          seatClasses = 'bg-gray-200 dark:bg-[#2A2A2A] border-[1.5px] border-gray-300 dark:border-[#333] text-gray-500 dark:text-[#555]';
                        } else {
                          const visualStyles = {
                            normal: {
                              idle: 'bg-green-50/80 dark:bg-black border-green-500/75 dark:border-green-500/50 text-green-700 dark:text-[#22c55e] shadow-[0_2px_5px_rgba(34,197,94,0.12),inset_0_-4px_0_rgba(34,197,94,0.42)] dark:shadow-none',
                              selected: 'bg-green-200 dark:bg-green-950/70 border-green-600 dark:border-green-400 text-green-950 dark:text-green-300 font-black dark:font-bold ring-2 ring-green-400/65 dark:ring-0 shadow-[0_0_14px_rgba(34,197,94,0.72),inset_0_-5px_0_rgba(21,128,61,0.95)] dark:shadow-[0_0_10px_rgba(34,197,94,0.55),inset_0_-4px_0_rgba(21,128,61,0.85)]'
                            },
                            vip: {
                              idle: 'bg-red-50/80 dark:bg-black border-red-500/75 dark:border-red-500/50 text-red-700 dark:text-[#ef4444] shadow-[0_2px_5px_rgba(239,68,68,0.12),inset_0_-4px_0_rgba(239,68,68,0.42)] dark:shadow-none',
                              selected: 'bg-red-200 dark:bg-red-950/70 border-red-600 dark:border-red-400 text-red-950 dark:text-red-300 font-black dark:font-bold ring-2 ring-red-400/65 dark:ring-0 shadow-[0_0_14px_rgba(239,68,68,0.72),inset_0_-5px_0_rgba(185,28,28,0.95)] dark:shadow-[0_0_10px_rgba(239,68,68,0.55),inset_0_-4px_0_rgba(185,28,28,0.85)]'
                            },
                            couple: {
                              idle: 'bg-pink-50/85 dark:bg-black border-pink-500/75 dark:border-pink-500/60 text-pink-700 dark:text-[#ec4899] shadow-[0_3px_7px_rgba(236,72,153,0.14),inset_0_-5px_0_rgba(236,72,153,0.48)] dark:shadow-[inset_0_0_5px_rgba(236,72,153,0.12)]',
                              selected: 'bg-pink-200 dark:bg-pink-950/70 border-pink-600 dark:border-pink-400 text-pink-950 dark:text-pink-300 font-black dark:font-bold ring-2 ring-pink-400/65 dark:ring-0 shadow-[0_0_15px_rgba(236,72,153,0.75),inset_0_-6px_0_rgba(190,24,93,0.95)] dark:shadow-[0_0_11px_rgba(236,72,153,0.6),inset_0_-4px_0_rgba(190,24,93,0.9)]'
                            },
                            bed: {
                              idle: 'bg-amber-50/85 dark:bg-black border-amber-500/75 dark:border-amber-500/55 text-amber-700 dark:text-[#f59e0b] shadow-[0_3px_7px_rgba(245,158,11,0.14),inset_0_-5px_0_rgba(245,158,11,0.52)] dark:shadow-[inset_0_-4px_0_rgba(245,158,11,0.7)]',
                              selected: 'bg-amber-200 dark:bg-amber-950/70 border-amber-600 dark:border-amber-400 text-amber-950 dark:text-amber-300 font-black dark:font-bold ring-2 ring-amber-400/70 dark:ring-0 shadow-[0_0_15px_rgba(245,158,11,0.75),inset_0_-6px_0_rgba(180,83,9,0.95)] dark:shadow-[0_0_11px_rgba(245,158,11,0.58),inset_0_-4px_0_rgba(180,83,9,0.9)]'
                            }
                          };
                          const typeVisual = visualStyles[type] || visualStyles.normal;
                          seatClasses = `border-[1.5px] ${isSelected ? typeVisual.selected : typeVisual.idle}`;
                        }

                        const isDisabled = isOccupied;

                        return (
                          <button
                            key={seatId}
                            className={`seat-btn absolute group flex flex-col items-center justify-center overflow-hidden border border-solid transition-all duration-200 ${isSelected ? 'light-selected-seat z-20 dark:z-auto' : (!isDisabled ? 'hover:-translate-y-[2px]' : '')} ${seatClasses}`}
                            style={{
                              left: leftPos,
                              top: 0,
                              width: seatWidth,
                              height: seatHeight,
                              borderRadius: extraBorderRadius,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => {
                              if (isDisabled) return;
                              if (dragStartSeatId.current === seatId && hasDragged.current) {
                                return;
                              }
                              onToggle(seatId);
                            }}
                            onMouseDown={(e) => {
                              if (isDisabled) return;
                              if (!isXPressed.current) {
                                const isSeatSelected = selectedIds.has(seatId);
                                dragAction.current = isSeatSelected ? 'deselect' : 'select';
                                dragStartSeatId.current = seatId;
                                hasDragged.current = false;
                              }
                            }}
                            onMouseEnter={() => {
                              if (isDisabled) return;
                              if (dragAction.current && !isXPressed.current) {
                                if (!hasDragged.current) {
                                  hasDragged.current = true;
                                  const startSeatSelected = selectedIds.has(dragStartSeatId.current);
                                  if (dragAction.current === 'select' && !startSeatSelected) {
                                    onToggle(dragStartSeatId.current);
                                  } else if (dragAction.current === 'deselect' && startSeatSelected) {
                                    onToggle(dragStartSeatId.current);
                                  }
                                }
                                const isSeatSelected = selectedIds.has(seatId);
                                if (dragAction.current === 'select' && !isSeatSelected) {
                                  onToggle(seatId);
                                } else if (dragAction.current === 'deselect' && isSeatSelected) {
                                  onToggle(seatId);
                                }
                              }
                            }}
                            disabled={isDisabled}
                            title={`Ghế ${displayId} — ${type === 'vip' ? 'VIP' : type === 'couple' ? 'Đôi' : type === 'bed' ? 'Giường nằm' : 'Thường'}${isOccupied ? ' — Đã đặt' : ''}`}
                          >
                            {isOccupied ? (
                              <img src={SoldSeatLogo} alt="Sold" className="w-[90%] h-[90%] object-contain opacity-90" width="192" height="192" />
                            ) : (
                              <span
                                className="relative z-10 font-bold leading-none select-none text-[10px]"
                              >
                                {displayId}
                              </span>
                            )}

                            {/* Thanh màu đáy ghế */}
                            {!isDisabled && (
                              <div
                                className={`absolute bottom-0 left-0 right-0 ${isSelected ? 'h-[5px] opacity-100 dark:h-[4px] dark:opacity-80' : 'h-[4px] opacity-[0.5] dark:opacity-30'} border-t transition-all duration-200 ${type === 'normal' ? 'bg-[#22c55e] border-[#22c55e]' :
                                    type === 'vip' ? 'bg-[#ef4444] border-[#ef4444]' :
                                      type === 'couple' ? 'bg-[#ec4899] border-[#ec4899]' :
                                        type === 'bed' ? 'bg-[#f59e0b] border-[#f59e0b]' : ''
                                  }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Zoom Controls & Hint Toolbar */}
        {!isSmallRoom && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex justify-center pointer-events-auto w-max">
            <div className="flex items-center gap-4 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-sm opacity-70 hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-1.5 pointer-events-none">
                <span className="material-symbols-outlined text-white/50 text-[13px]">open_with</span>
                <span className="text-[11px] text-white/50 font-medium hidden md:inline">
                  Đè 'Z' + Cuộn để zoom · Đè 'X' + Kéo để di chuyển
                </span>
              </div>
              <div className="w-[1px] h-3 bg-white/20"></div>
              <div className="flex items-center gap-1">
                <button
                  onClick={zoomOut}
                  title="Thu nhỏ"
                  className="w-6 h-6 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors text-sm"
                >−</button>
                <button
                  onClick={zoomReset}
                  title="Mặc định"
                  className="w-6 h-6 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors text-[10px]"
                >⟳</button>
                <button
                  onClick={zoomIn}
                  title="Phóng to"
                  className="w-6 h-6 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors text-sm"
                >+</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeatMatrix(props) {
  return (
    <SeatMatrixErrorBoundary>
      <SeatMatrixInner {...props} />
    </SeatMatrixErrorBoundary>
  );
}
