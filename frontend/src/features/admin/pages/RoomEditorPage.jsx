import { useCallback } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Tv,
  Square,
  MousePointer,
  Grid,
  CheckCircle,
} from 'lucide-react';
import { theaterApi } from '../api/theaterApi';
import { useToastStore } from '../hooks/useToastStore';

// === CONSTANTS ===
const SEAT_TYPES = {
  NORMAL: {
    id: 'NORMAL',
    label: 'Ghế Thường',
    color: '#22c55e',
    bg: '#111',
    border: '1px solid rgba(34,197,94,0.55)',
    hoverBg: 'rgba(34,197,94,0.2)',
    shadow: 'inset 0 -4px 0 rgba(34,197,94,0.7)',
    borderRadius: '6px',
    width: 1,
  },
  VIP: {
    id: 'VIP',
    label: 'Ghế VIP',
    color: '#ef4444',
    bg: '#111',
    border: '1px solid rgba(239,68,68,0.55)',
    hoverBg: 'rgba(239,68,68,0.2)',
    shadow: 'inset 0 -4px 0 rgba(239,68,68,0.7)',
    borderRadius: '6px',
    width: 1,
  },
  COUPLE: {
    id: 'COUPLE',
    label: 'Ghế Đôi',
    color: '#ec4899',
    bg: '#111',
    border: '1px solid rgba(236,72,153,0.65)',
    hoverBg: 'rgba(236,72,153,0.2)',
    shadow:
      'inset 0 -6px 0 rgba(236,72,153,0.7), inset 0 0 5px rgba(236,72,153,0.12)',
    borderRadius: '12px 12px 4px 4px',
    width: 2,
  },
  BED: {
    id: 'BED',
    label: 'Ghế Giường Nằm',
    color: '#facc15',
    bg: '#111',
    border: '1px solid rgba(250,204,21,0.55)',
    hoverBg: 'rgba(250,204,21,0.2)',
    shadow: 'inset 0 -4px 0 rgba(250,204,21,0.7)',
    borderRadius: '6px',
    width: 1,
  },
  EMPTY: {
    id: 'EMPTY',
    label: 'Lối Đi (Trống)',
    color: 'transparent',
    bg: 'transparent',
    border: '1px dashed rgba(128,128,128,0.5)',
    hoverBg: 'rgba(128,128,128,0.15)',
    borderRadius: '6px',
    width: 1,
  },
};

const ROOM_TYPES = [
  { id: 'LO_RAP', label: 'Rạp tiêu chuẩn (LoRap)' },
  { id: 'LO_BED', label: 'Rạp giường nằm (LoBed)' },
  { id: 'LO_SCREEN_X', label: 'Rạp ScreenX (LoScreenX)' },
];

function getRowSymbol(index) {
  let symbol = '';
  let i = index;
  while (i >= 0) {
    symbol = String.fromCharCode((i % 26) + 65) + symbol;
    i = Math.floor(i / 26) - 1;
  }
  return symbol;
}

function getIndexFromSymbol(symbol) {
  let index = 0;
  for (let i = 0; i < symbol.length; i++) {
    index = index * 26 + (symbol.charCodeAt(i) - 64);
  }
  return index - 1;
}

function readRoomDraft(key) {
  try {
    const draft = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (
      !draft ||
      !Array.isArray(draft.grid) ||
      !draft.grid.length ||
      !Array.isArray(draft.grid[0])
    )
      return null;
    const rows = draft.grid.length;
    const cols = draft.grid[0].length;
    if (
      !cols ||
      rows * cols > 1000 ||
      !draft.grid.every(
        (row) =>
          Array.isArray(row) &&
          row.length === cols &&
          row.every(
            (cell) => Object.hasOwn(SEAT_TYPES, cell) || cell === 'BED_BOTTOM'
          )
      )
    )
      return null;
    return {
      ...draft,
      roomName: String(draft.roomName || ''),
      roomType: ROOM_TYPES.some((type) => type.id === draft.roomType)
        ? draft.roomType
        : 'LO_RAP',
      numRows: rows,
      numCols: cols,
      inputRows: rows,
      inputCols: cols,
    };
  } catch {
    return null;
  }
}

export default function RoomEditorPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const { theaterId, roomId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(roomId);
  const draftKey = `room_draft_${theaterId}_${roomId || 'new'}`;
  const [initialDraft] = useState(() => readRoomDraft(draftKey));
  const addToast = useToastStore((state) => state.addToast);

  // === FORM STATE ===
  const [roomName, setRoomName] = useState(initialDraft?.roomName || '');
  const [roomType, setRoomType] = useState(initialDraft?.roomType || 'LO_RAP');
  const [isActive, setIsActive] = useState(initialDraft?.isActive ?? true);
  const [maxSeatsPerUser, setMaxSeatsPerUser] = useState(
    initialDraft?.maxSeatsPerUser || 0
  );
  const [hasSeatLimit, setHasSeatLimit] = useState(
    initialDraft?.hasSeatLimit ?? false
  );
  const [saving, setSaving] = useState(false);

  // === MATRIX STATE ===
  const [numRows, setNumRows] = useState(initialDraft?.numRows || 10);
  const [numCols, setNumCols] = useState(initialDraft?.numCols || 15);
  const [inputRows, setInputRows] = useState(initialDraft?.numRows || 10);
  const [inputCols, setInputCols] = useState(initialDraft?.numCols || 15);
  const [entrancePositions, setEntrancePositions] = useState(
    initialDraft?.entrancePositions || [{ side: 'LEFT', offset: 0 }]
  );
  const [exitPositions, setExitPositions] = useState(
    initialDraft?.exitPositions || [{ side: 'RIGHT', offset: 0 }]
  );
  const [accessTool, setAccessTool] = useState('ENTRANCE');
  // grid: mảng 2 chiều lưu type của từng ô [row][col]
  const [grid, setGrid] = useState(
    () =>
      initialDraft?.grid ||
      (isEditMode
        ? []
        : Array.from({ length: 10 }, () => Array(15).fill('NORMAL')))
  );

  // === TOOL STATE ===
  const [selectedTool, setSelectedTool] = useState(
    initialDraft?.roomType === 'LO_BED' ? 'BED' : SEAT_TYPES.NORMAL.id
  );
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    newType: null,
  });

  // Khởi tạo lưới trống khi vào trang hoặc nhấn "Tạo lưới"
  const generateGrid = useCallback(
    (rows, cols, overrideRoomType) => {
      const currentRoomType = overrideRoomType || roomType;
      const defaultSeat = currentRoomType === 'LO_BED' ? 'BED' : 'NORMAL';
      if (rows * cols > 1000) {
        addToast({
          message: 'Số lượng ghế (hàng x cột) không được vượt quá 1000!',
          type: 'error',
        });
        return;
      }
      setNumRows(rows);
      setNumCols(cols);
      setInputRows(rows);
      setInputCols(cols);
      const newGrid = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          if (defaultSeat === 'BED') {
            row.push(r % 2 === 0 ? 'BED' : 'BED_BOTTOM');
          } else {
            row.push(defaultSeat);
          }
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
    },
    [roomType, addToast]
  );

  const handleResizeGrid = (newRows, newCols) => {
    const defaultSeat = roomType === 'LO_BED' ? 'BED' : 'NORMAL';
    if (newRows * newCols > 1000) {
      addToast({
        message: 'Số lượng ghế (hàng x cột) không được vượt quá 1000!',
        type: 'error',
      });
      setInputRows(numRows); // Revert
      setInputCols(numCols); // Revert
      return;
    }
    setNumRows(newRows);
    setNumCols(newCols);
    setInputRows(newRows);
    setInputCols(newCols);
    setGrid((prevGrid) => {
      const newGrid = [];
      for (let r = 0; r < newRows; r++) {
        const row = [];
        for (let c = 0; c < newCols; c++) {
          if (r < prevGrid.length && c < prevGrid[r].length) {
            row.push(prevGrid[r][c]);
          } else {
            if (defaultSeat === 'BED') {
              row.push(r % 2 === 0 ? 'BED' : 'BED_BOTTOM');
            } else {
              row.push(defaultSeat);
            }
          }
        }
        newGrid.push(row);
      }
      return newGrid;
    });
  };

  const verticalAisles = useMemo(() => {
    const aisles = [];
    if (!grid || grid.length === 0) return aisles;

    const occupiedRowIndexes = grid
      .map((row, index) => (row.some((cell) => cell !== 'EMPTY') ? index : -1))
      .filter((index) => index !== -1);
    if (occupiedRowIndexes.length === 0) return aisles;

    const startR = occupiedRowIndexes[0];
    const lastOccupiedR = occupiedRowIndexes[occupiedRowIndexes.length - 1];
    let endR = lastOccupiedR;
    while (endR > startR && grid[endR]?.some((cell) => cell === 'COUPLE')) {
      endR--;
    }

    let currentStartC = -1;
    for (let c = 0; c < numCols; c++) {
      let isColEmpty = true;
      for (let r = startR; r <= endR; r++) {
        let isVisuallyEmpty = false;
        if (grid[r][c] === 'EMPTY') {
          isVisuallyEmpty = true;
          if (c > 0 && grid[r][c - 1] === 'COUPLE') {
            isVisuallyEmpty = false;
          }
        }
        if (!isVisuallyEmpty) {
          isColEmpty = false;
          break;
        }
      }
      if (isColEmpty) {
        if (currentStartC === -1) currentStartC = c;
      } else {
        if (currentStartC !== -1) {
          aisles.push({ startC: currentStartC, endC: c - 1, startR, endR });
          currentStartC = -1;
        }
      }
    }
    if (currentStartC !== -1) {
      aisles.push({ startC: currentStartC, endC: numCols - 1, startR, endR });
    }

    const normalizedAisles = aisles.flatMap((aisle, sourceIndex) => {
      const withMeta = (range) => ({
        ...range,
        sourceIndex,
        isEdgeAisle: aisle.startC === 0 || aisle.endC === numCols - 1,
      });

      if (aisle.startC === aisle.endC) {
        return [withMeta(aisle)];
      }

      if (aisle.startC === 0) {
        return [withMeta({ ...aisle, startC: aisle.endC })];
      }
      if (aisle.endC === numCols - 1) {
        return [withMeta({ ...aisle, endC: aisle.startC })];
      }
      if (aisle.endC - aisle.startC + 1 === 2) {
        return [withMeta(aisle)];
      }
      return [
        withMeta({ ...aisle, endC: aisle.startC }),
        withMeta({ ...aisle, startC: aisle.endC }),
      ];
    });

    return normalizedAisles.sort((a, b) => a.startC - b.startC);
  }, [grid, numCols]);

  // Save draft to sessionStorage whenever state changes
  useEffect(() => {
    if (grid && grid.length > 0) {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          roomName,
          roomType,
          isActive,
          maxSeatsPerUser,
          hasSeatLimit,
          numRows,
          numCols,
          inputRows,
          inputCols,
          entrancePositions,
          exitPositions,
          grid,
        })
      );
    }
  }, [
    roomName,
    roomType,
    isActive,
    maxSeatsPerUser,
    hasSeatLimit,
    numRows,
    numCols,
    inputRows,
    inputCols,
    entrancePositions,
    exitPositions,
    grid,
    draftKey,
  ]);

  useEffect(() => {
    if (initialDraft || !isEditMode) return;
    const fetchRoomDetails = () => {
      return theaterApi
        .getRoomDetails(roomId)
        .then((roomData) => {
          setRoomName(roomData.name);
          setRoomType(roomData.roomType);
          setSelectedTool(roomData.roomType === 'LO_BED' ? 'BED' : 'NORMAL');
          setIsActive(roomData.isActive);
          setMaxSeatsPerUser(roomData.maxSeatsPerUser || 0);
          setHasSeatLimit((roomData.maxSeatsPerUser || 0) > 0);
          const parsePositions = (positions, fallback) => {
            if (!Array.isArray(positions) || positions.length === 0)
              return [fallback];
            return positions.map((position) => {
              const [side, rawOffset] = position.split(':');
              return { side, offset: Number(rawOffset) || 0 };
            });
          };
          setEntrancePositions(
            parsePositions(roomData.entrancePositions, {
              side: roomData.entranceSide || 'LEFT',
              offset: roomData.entranceOffset ?? 0,
            })
          );
          setExitPositions(
            parsePositions(roomData.exitPositions, {
              side: roomData.exitSide || 'RIGHT',
              offset: roomData.exitOffset ?? 0,
            })
          );
          if (roomData.seats && roomData.seats.length > 0) {
            // Reconstruct grid from seats
            // Find max row and col
            let maxRowIdx = 0;
            let maxCol = 0;
            roomData.seats.forEach((s) => {
              const rIdx =
                s.rowIndex !== undefined && s.rowIndex !== null
                  ? s.rowIndex
                  : getIndexFromSymbol(s.rowSymbol);
              if (rIdx > maxRowIdx) maxRowIdx = rIdx;
              if (s.seatNumber > maxCol) maxCol = s.seatNumber;
            });
            // Remove + 2 padding. maxRowIdx is 0-indexed so we need maxRowIdx + 1 for count.
            // maxCol is 1-indexed (seatNumber) so we just use maxCol.
            const numRowsFetched =
              roomData.matrixHeight || (maxRowIdx >= 0 ? maxRowIdx + 1 : 10);
            const numColsFetched =
              roomData.matrixWidth || (maxCol > 0 ? maxCol : 15);

            setNumRows(numRowsFetched);
            setNumCols(numColsFetched);
            setInputRows(numRowsFetched);
            setInputCols(numColsFetched);

            // Build empty grid
            const newGrid = [];
            for (let r = 0; r < numRowsFetched; r++) {
              newGrid.push(new Array(numColsFetched).fill('EMPTY'));
            }

            roomData.seats.forEach((s) => {
              const rIdx =
                s.rowIndex !== undefined && s.rowIndex !== null
                  ? s.rowIndex
                  : getIndexFromSymbol(s.rowSymbol);
              const cIdx =
                s.columnIndex !== undefined && s.columnIndex !== null
                  ? s.columnIndex
                  : numColsFetched - s.seatNumber;
              if (
                rIdx >= 0 &&
                rIdx < numRowsFetched &&
                cIdx >= 0 &&
                cIdx < numColsFetched
              ) {
                if (newGrid[rIdx][cIdx] !== 'BED_BOTTOM') {
                  newGrid[rIdx][cIdx] = s.seatType;
                  if (s.seatType === 'BED' && rIdx + 1 < numRowsFetched) {
                    newGrid[rIdx + 1][cIdx] = 'BED_BOTTOM';
                  }
                }
              }
            });
            setGrid(newGrid);
          } else {
            setGrid(
              Array.from({ length: 10 }, (_, row) =>
                Array(15).fill(
                  roomData.roomType === 'LO_BED'
                    ? row % 2 === 0
                      ? 'BED'
                      : 'BED_BOTTOM'
                    : 'NORMAL'
                )
              )
            );
          }
        })
        .catch(() => {
          addToast({ message: 'Lỗi khi tải thông tin phòng', type: 'error' });
          navigate(`/admin/theaters`, {
            state: { theaterId: Number(theaterId) },
          });
        });
    };
    fetchRoomDetails();
  }, [initialDraft, isEditMode, roomId, addToast, navigate, theaterId]);

  // Xử lý sự kiện vẽ ghế
  const handleSeatInteract = (r, c) => {
    if (grid[r][c] === selectedTool) return;

    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]];

    if (selectedTool === 'COUPLE') {
      if (c === numCols - 1) return;
      newGrid[r][c] = 'COUPLE';
      newGrid[r][c + 1] = 'EMPTY';
    } else if (selectedTool === 'BED') {
      if (r === numRows - 1) return; // Cannot place BED on the last row

      if (grid[r][c] === 'BED_BOTTOM' && r > 0) {
        newGrid[r - 1] = [...newGrid[r - 1]];
        newGrid[r - 1][c] = 'EMPTY';
      }
      if (grid[r + 1] && grid[r + 1][c] === 'BED' && r + 2 < numRows) {
        newGrid[r + 2] = [...newGrid[r + 2]];
        newGrid[r + 2][c] = 'EMPTY';
      }

      newGrid[r][c] = 'BED';
      newGrid[r + 1] = [...newGrid[r + 1]];
      newGrid[r + 1][c] = 'BED_BOTTOM';
    } else if (selectedTool === 'EMPTY') {
      if (grid[r][c] === 'BED' && r + 1 < numRows) {
        newGrid[r + 1] = [...newGrid[r + 1]];
        newGrid[r + 1][c] = 'EMPTY';
      }
      if (grid[r][c] === 'BED_BOTTOM' && r > 0) {
        newGrid[r - 1] = [...newGrid[r - 1]];
        newGrid[r - 1][c] = 'EMPTY';
      }
      newGrid[r][c] = 'EMPTY';
    } else {
      newGrid[r][c] = selectedTool;
    }

    setGrid(newGrid);
  };

  const handleMouseEnter = (r, c) => {
    if (isMouseDown) {
      handleSeatInteract(r, c);
    }
  };

  const handleMouseDown = (r, c) => {
    setIsMouseDown(true);
    handleSeatInteract(r, c);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Tính toán số lượng ghế thực tế và map hiển thị
  const capacity = useMemo(() => {
    let count = 0;
    grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell !== 'EMPTY') count++;
      });
    });
    return count;
  }, [grid]);

  // Xử lý lưu dữ liệu
  const handleSave = async () => {
    if (saving) return;
    if (!roomName.trim()) {
      addToast({ message: 'Vui lòng điền tên phòng chiếu', type: 'error' });
      return;
    }
    if (roomName.trim().length < 2) {
      addToast({
        message: 'Tên phòng chiếu phải có ít nhất 2 ký tự',
        type: 'error',
      });
      return;
    }
    if (roomName.trim().length > 50) {
      addToast({
        message: 'Tên phòng chiếu không được vượt quá 50 ký tự',
        type: 'error',
      });
      return;
    }

    const seatsToSave = [];
    let rowSymbolIndex = 0;

    for (let r = 0; r < numRows; r++) {
      let hasSeatInRow = false;
      for (let c = 0; c < numCols; c++) {
        if (grid[r][c] !== 'EMPTY') {
          hasSeatInRow = true;
          break;
        }
      }

      if (hasSeatInRow) {
        const symbol = getRowSymbol(rowSymbolIndex);
        rowSymbolIndex++;
        let seqNum = 1;
        for (let c = 0; c < numCols; c++) {
          const type = grid[r][c];
          if (type !== 'EMPTY' && type !== 'BED_BOTTOM') {
            seatsToSave.push({
              rowSymbol: symbol,
              seatNumber: seqNum, // Lưu số ghế tăng dần từ trái sang phải
              rowIndex: r,
              columnIndex: c,
              seatType: type,
              status: 'ACTIVE',
            });
            seqNum++;
          }
        }
      }
    }

    const payload = {
      name: roomName,
      roomType: roomType,
      capacity: capacity,
      isActive: isActive,
      maxSeatsPerUser: parseInt(maxSeatsPerUser) || 0,
      matrixWidth: numCols,
      matrixHeight: numRows,
      entranceSide: entrancePositions[0]?.side || 'LEFT',
      entranceOffset: entrancePositions[0]?.offset ?? 0,
      exitSide: exitPositions[0]?.side || 'RIGHT',
      exitOffset: exitPositions[0]?.offset ?? 0,
      entrancePositions: entrancePositions.map(
        (position) =>
          `${position.side}:${Math.min(
            position.offset,
            position.side === 'LEFT' || position.side === 'RIGHT'
              ? numRows - 1
              : numCols - 1
          )}`
      ),
      exitPositions: exitPositions.map(
        (position) =>
          `${position.side}:${Math.min(
            position.offset,
            position.side === 'LEFT' || position.side === 'RIGHT'
              ? numRows - 1
              : numCols - 1
          )}`
      ),
      seats: seatsToSave,
    };

    setSaving(true);
    try {
      if (isEditMode) {
        await theaterApi.updateRoom(roomId, payload);
        addToast({
          message: 'Cập nhật phòng chiếu thành công!',
          type: 'success',
        });
      } else {
        await theaterApi.createRoom(theaterId, payload);
        addToast({ message: 'Tạo phòng chiếu thành công!', type: 'success' });
      }
      sessionStorage.removeItem(draftKey);
      navigate('/admin/theaters', { state: { theaterId: Number(theaterId) } });
    } catch (error) {
      addToast({
        message: error.message || 'Có lỗi xảy ra khi lưu phòng chiếu',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Tính toán vị trí Y của từng hàng để hỗ trợ khoảng cách (cách 1 ô) cho ghế COUPLE
  const rowOffsets = useMemo(() => {
    const offsets = [];
    let currentY = 0;
    for (let r = 0; r < numRows; r++) {
      let hasCouple = false;
      if (grid[r]) {
        for (let c = 0; c < numCols; c++) {
          if (grid[r][c] === 'COUPLE') {
            hasCouple = true;
            break;
          }
        }
      }

      let prevHasCouple = false;
      if (r > 0 && grid[r - 1]) {
        for (let c = 0; c < numCols; c++) {
          if (grid[r - 1][c] === 'COUPLE') {
            prevHasCouple = true;
            break;
          }
        }
      }

      let extraGap = 0;
      // Nếu hàng hiện tại có ghế COUPLE và hàng trước đó KHÔNG có ghế COUPLE,
      // tạo một khoảng cách vừa phải (ví dụ: 20px) để tách biệt dãy ghế
      if (hasCouple && !prevHasCouple && r > 0) {
        extraGap = 20;
      }

      currentY += extraGap;
      offsets.push({ y: currentY, extraGap });
      currentY += 42; // chiều cao mặc định của mỗi hàng (36px ghế + 6px gap)
    }
    return offsets;
  }, [grid, numRows, numCols]);

  const displaySymbols = useMemo(() => {
    let index = 0;
    return grid.map((row) => {
      let rowIsEmpty = row.every(
        (cell) => cell === 'EMPTY' || cell === 'BED_BOTTOM'
      );
      if (rowIsEmpty) {
        return '';
      }
      const sym = getRowSymbol(index);
      index++;
      return sym;
    });
  }, [grid]);

  const accessBoundaryCells = useMemo(() => {
    const cells = [];
    for (let c = 0; c < numCols; c++) {
      cells.push({ side: 'TOP', offset: c, row: 0, col: c + 1 });
      cells.push({ side: 'BOTTOM', offset: c, row: numRows + 1, col: c + 1 });
    }
    for (let r = 0; r < numRows; r++) {
      cells.push({ side: 'LEFT', offset: r, row: r + 1, col: 0 });
      cells.push({ side: 'RIGHT', offset: r, row: r + 1, col: numCols + 1 });
    }
    return cells;
  }, [numRows, numCols]);

  const handleAccessCellClick = (side, offset) => {
    const position = { side, offset };
    const matches = (item) => item.side === side && item.offset === offset;
    if (accessTool === 'ENTRANCE') {
      setExitPositions((current) => current.filter((item) => !matches(item)));
      setEntrancePositions((current) =>
        current.some(matches)
          ? current.filter((item) => !matches(item))
          : [...current, position]
      );
    } else {
      setEntrancePositions((current) =>
        current.filter((item) => !matches(item))
      );
      setExitPositions((current) =>
        current.some(matches)
          ? current.filter((item) => !matches(item))
          : [...current, position]
      );
    }
  };

  return (
    <>
      <style>{`
        .seat-grid-flex {
          display: flex;
          flex-direction: column;
          gap: 6px;
          justify-content: center;
          user-select: none;
          padding: 20px 62px 20px 20px;
          width: max-content;
          margin: 42px auto;
          position: relative;
        }
        .seat-row-flex {
          display: flex;
          gap: 6px;
        }
        .seat-cell {
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .seat-cell:active {
          transform: scale(0.9);
        }
        .seat-cell.is-seat:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255,255,255,0.05) !important;
          background-color: var(--hover-bg) !important;
        }
        .seat-cell:not(.is-seat):hover {
          background-color: var(--hover-bg) !important;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          height: '100%',
          paddingBottom: '20px',
        }}
      >
        {/* === HEADER === */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() =>
                navigate('/admin/theaters', {
                  state: { theaterId: Number(theaterId) },
                })
              }
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2
                style={{
                  color: '#fff',
                  fontSize: '22px',
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                {isEditMode ? 'Chỉnh sửa Phòng chiếu' : 'Thêm Phòng chiếu mới'}
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                  margin: '4px 0 0 0',
                }}
              >
                Thiết kế sơ đồ ghế và cấu hình thông tin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: saving
                ? 'rgba(220,38,38,0.5)'
                : 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* === SIDEBAR CONTROLS === */}
          <div
            style={{
              width: '300px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Box 1: Info */}
            <div
              style={{
                background: '#0e0e0e',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Tv size={16} color="#6366f1" /> Thông tin chung
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: '6px',
                    }}
                  >
                    Tên phòng chiếu
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) =>
                      setRoomName(
                        e.target.value.replace(
                          /[!@#$%^&*()_+={}[\]|\\<>/?~`]/g,
                          ''
                        )
                      )
                    }
                    placeholder="VD: Phòng 1"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: '#fff',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: '6px',
                    }}
                  >
                    Loại phòng
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      if (roomType !== newType) {
                        setConfirmModal({ isOpen: true, newType });
                      }
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: '#fff',
                      outline: 'none',
                      appearance: 'none',
                    }}
                  >
                    {ROOM_TYPES.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        style={{ background: '#1a1a1a' }}
                      >
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span
                    style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                  >
                    Trạng thái hoạt động
                  </span>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#6366f1',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span
                    style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                  >
                    Bật giới hạn ghế / người
                  </span>
                  <input
                    type="checkbox"
                    checked={hasSeatLimit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasSeatLimit(checked);
                      if (!checked) {
                        setMaxSeatsPerUser(0);
                      } else if (maxSeatsPerUser === 0) {
                        setMaxSeatsPerUser(4); // Default when toggled on
                      }
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#6366f1',
                    }}
                  />
                </div>

                {hasSeatLimit && (
                  <div
                    style={{ marginTop: '-4px', animation: 'fadeIn 0.2s ease' }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.5)',
                        marginBottom: '6px',
                      }}
                    >
                      Số ghế tối đa một user được đặt
                    </label>
                    <input
                      type="text"
                      value={maxSeatsPerUser > 0 ? maxSeatsPerUser : ''}
                      onChange={(e) =>
                        setMaxSeatsPerUser(
                          e.target.value.replace(/[^0-9]/g, '')
                        )
                      }
                      placeholder="VD: 4"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Matrix Gen */}
            <div
              style={{
                background: '#0e0e0e',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Grid size={16} color="#2dd4bf" /> Kích thước sơ đồ
              </h3>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: '6px',
                    }}
                  >
                    Số hàng
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={inputRows}
                    onChange={(e) => setInputRows(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: '#fff',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: '6px',
                    }}
                  >
                    Số cột
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={inputCols}
                    onChange={(e) => setInputCols(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: '#fff',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              <>
                {!isStaff && (
                  <button
                    onClick={() =>
                      handleResizeGrid(
                        parseInt(inputRows) || 1,
                        parseInt(inputCols) || 1
                      )
                    }
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(99,102,241,0.3)',
                      background: 'rgba(99,102,241,0.1)',
                      color: '#818cf8',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Xác nhận tạo sơ đồ
                  </button>
                )}
              </>
            </div>

            {/* Box 3: Tools */}
            <div
              style={{
                background: '#0e0e0e',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <MousePointer size={16} color="#fbbf24" /> Công cụ vẽ
              </h3>
              <p
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                  margin: '0 0 12px 0',
                }}
              >
                Chọn công cụ và nhấn/kéo thả trên sơ đồ để vẽ.
              </p>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {Object.values(SEAT_TYPES)
                  .filter((tool) => {
                    if (roomType === 'LO_BED')
                      return tool.id === 'BED' || tool.id === 'EMPTY';
                    return tool.id !== 'BED';
                  })
                  .map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background:
                          selectedTool === tool.id
                            ? tool.hoverBg
                            : 'rgba(255,255,255,0.02)',
                        border:
                          selectedTool === tool.id
                            ? tool.border
                            : '1px solid rgba(255,255,255,0.05)',
                        color:
                          selectedTool === tool.id
                            ? '#fff'
                            : 'rgba(255,255,255,0.5)',
                        boxShadow:
                          selectedTool === tool.id && tool.shadow
                            ? tool.shadow
                            : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          background: tool.bg,
                          border: tool.border,
                          boxShadow: tool.shadow || 'none',
                        }}
                      ></div>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: selectedTool === tool.id ? 700 : 500,
                        }}
                      >
                        {tool.label}
                      </span>
                      {selectedTool === tool.id && (
                        <CheckCircle
                          size={14}
                          color={tool.color}
                          style={{ marginLeft: 'auto' }}
                        />
                      )}
                    </button>
                  ))}
              </div>

              <div
                style={{
                  height: '1px',
                  background: 'rgba(255,255,255,0.07)',
                  margin: '14px 0',
                }}
              />
              <p
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                  margin: '0 0 8px',
                }}
              >
                Chọn loại cửa rồi nhấn trực tiếp lên ô viền bao quanh sơ đồ.
                Nhấn lại để xóa.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAccessTool('ENTRANCE')}
                  style={{
                    flex: 1,
                    padding: '9px 8px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: accessTool === 'ENTRANCE' ? '#111' : '#facc15',
                    background:
                      accessTool === 'ENTRANCE' ? '#facc15' : 'transparent',
                    border: '1px solid rgba(250,204,21,0.65)',
                  }}
                >
                  Lối vào
                </button>
                <button
                  type="button"
                  onClick={() => setAccessTool('EXIT')}
                  style={{
                    flex: 1,
                    padding: '9px 8px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: accessTool === 'EXIT' ? '#04130a' : '#22c55e',
                    background:
                      accessTool === 'EXIT' ? '#22c55e' : 'transparent',
                    border: '1px solid rgba(34,197,94,0.65)',
                  }}
                >
                  Lối ra
                </button>
              </div>
            </div>
          </div>

          {/* === MATRIX CANVAS === */}
          <div
            style={{
              flex: 1,
              background: '#0e0e0e',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Square size={16} color="#a855f7" />
                <span
                  style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}
                >
                  Sơ đồ ghế
                </span>
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                }}
              >
                Tổng sức chứa:{' '}
                <strong style={{ color: '#fff' }}>{capacity}</strong> ghế
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '30px 20px' }}>
              {/* Screen Area */}
              <div
                style={{
                  marginBottom: '32px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  margin: '0 auto',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '3px',
                    borderRadius: '9999px',
                    background:
                      'linear-gradient(90deg, transparent, rgba(230,26,39,0.7) 30%, rgba(230,26,39,0.7) 70%, transparent)',
                    boxShadow: '0 4px 20px rgba(230,26,39,0.4)',
                  }}
                />
                <div
                  style={{
                    width: '85%',
                    height: '20px',
                    background:
                      'radial-gradient(ellipse at top, rgba(230,26,39,0.2), transparent 70%)',
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    letterSpacing: '0.5em',
                    color: 'rgba(255,255,255,0.8)',
                    marginTop: '4px',
                  }}
                >
                  MÀN HÌNH
                </span>
              </div>

              {/* Grid Area */}
              <div className="seat-grid-flex" onMouseLeave={handleMouseUp}>
                {/* Viền cấu hình lối vào / lối ra bao quanh trực tiếp ma trận ghế */}
                {accessBoundaryCells.map((cell) => {
                  const isEntrance = entrancePositions.some(
                    (position) =>
                      position.side === cell.side &&
                      position.offset === cell.offset
                  );
                  const isExit = exitPositions.some(
                    (position) =>
                      position.side === cell.side &&
                      position.offset === cell.offset
                  );
                  const contentLeft = 20 + 30 + 6 + 36 + 6; // padding + label + gap + boundary + gap
                  const contentTop = 20;
                  const hasBedInLastRow = grid[numRows - 1]?.some(
                    (c) => c === 'BED'
                  );
                  const lastRowBottom =
                    contentTop +
                    (rowOffsets[numRows - 1]?.y || 0) +
                    (hasBedInLastRow ? 65 : 36) +
                    6;

                  let left = contentLeft + cell.offset * (36 + 6);
                  let top = contentTop - 36 - 6;
                  if (cell.side === 'BOTTOM') top = lastRowBottom;
                  if (cell.side === 'LEFT' || cell.side === 'RIGHT') {
                    left =
                      cell.side === 'LEFT'
                        ? contentLeft - 36 - 6
                        : contentLeft + numCols * (36 + 6);
                    top = contentTop + (rowOffsets[cell.offset]?.y || 0);
                  }

                  return (
                    <button
                      type="button"
                      key={`${cell.side}-${cell.offset}`}
                      onClick={() =>
                        handleAccessCellClick(cell.side, cell.offset)
                      }
                      title={`${isEntrance ? 'Lối vào' : isExit ? 'Lối ra' : 'Ô viền'} — ${cell.side} ${cell.offset + 1}`}
                      style={{
                        position: 'absolute',
                        left: `${left}px`,
                        top: `${top}px`,
                        width: '36px',
                        height: '36px',
                        padding: 0,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        zIndex: 30,
                        fontSize: '9px',
                        fontWeight: 900,
                        color: isEntrance ? '#111' : isExit ? '#fff' : '#666',
                        background: isEntrance
                          ? '#facc15'
                          : isExit
                            ? '#22c55e'
                            : 'rgba(128,128,128,0.05)',
                        border: isEntrance
                          ? '1px solid #fde047'
                          : isExit
                            ? '1px solid #4ade80'
                            : '1px dashed rgba(128,128,128,0.4)',
                      }}
                    >
                      {isEntrance ? 'VÀO' : isExit ? 'RA' : ''}
                    </button>
                  );
                })}

                {/* Render chữ LỐI ĐI dọc cho các đoạn trống */}
                {verticalAisles.map((aisle, idx) => {
                  const numColsInGroup = aisle.endC - aisle.startC + 1;

                  const leftPos =
                    20 + 30 + 6 + 36 + 6 + aisle.startC * (36 + 6);
                  const topPos = 20 + rowOffsets[aisle.startR].y;
                  const width = numColsInGroup * 36 + (numColsInGroup - 1) * 6;
                  const hasBedInAisleEnd = grid[aisle.endR]?.some(
                    (c) => c === 'BED'
                  );
                  const height =
                    rowOffsets[aisle.endR].y -
                    rowOffsets[aisle.startR].y +
                    (hasBedInAisleEnd ? 65 : 36);
                  const rowIndices = Array.from(
                    { length: aisle.endR - aisle.startR + 1 },
                    (_, offset) => aisle.startR + offset
                  );

                  return (
                    <div
                      key={`aisle-col-${idx}`}
                      className="absolute flex items-center justify-center"
                      style={{
                        left: `${leftPos}px`,
                        top: `${topPos}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        zIndex: 0,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        borderRadius: '8px',
                        background:
                          'linear-gradient(90deg, rgba(128,128,128,0.02), rgba(128,128,128,0.06) 50%, rgba(128,128,128,0.02))',
                        border: '1px solid rgba(128,128,128,0.1)',
                        boxShadow: 'inset 0 0 12px rgba(128,128,128,0.03)',
                      }}
                    >
                      {rowIndices.map((r) => (
                        <div
                          key={`admin-aisle-line-${r}`}
                          style={{
                            position: 'absolute',
                            top: `${rowOffsets[r].y - rowOffsets[aisle.startR].y + 18}px`,
                            left: '8%',
                            width: '84%',
                            height: '2px',
                            background:
                              'linear-gradient(90deg, transparent, rgba(128,128,128,0.3), transparent)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          }}
                        />
                      ))}
                      <span
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          fontWeight: 900,
                          fontSize: '14px',
                          letterSpacing: '6px',
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          whiteSpace: 'nowrap',
                          userSelect: 'none',
                          color: '#888',
                          textShadow: 'none',
                        }}
                      >
                        LỐI ĐI
                      </span>
                    </div>
                  );
                })}

                {/* Các ô ghế */}
                {grid.map((row, rIndex) => {
                  let rowIsEmpty = row.every((cell) => cell === 'EMPTY');
                  const displaySymbol = displaySymbols[rIndex];

                  const extraGap = rowOffsets[rIndex].extraGap;

                  return (
                    <div
                      key={rIndex}
                      className="seat-row-flex"
                      style={{
                        marginTop: extraGap > 0 ? `${extraGap}px` : '0px',
                      }}
                    >
                      {/* Cột hiển thị chữ cái của hàng */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: rowIsEmpty ? 'transparent' : '#888',
                        }}
                      >
                        {displaySymbol}
                      </div>

                      {/* Khoảng trống viền trái để chữ cái A,B,C nằm ra ngoài các ô VÀO/RA */}
                      <div
                        style={{ width: '36px', height: '36px', flexShrink: 0 }}
                      />

                      {/* Các cột ghế */}
                      {row.map((cellType, cIndex) => {
                        const typeInfo =
                          SEAT_TYPES[cellType] || SEAT_TYPES.NORMAL;

                        // Nếu là ô tiếp theo của ghế COUPLE (sẽ là EMPTY do logic set ở trên), nhưng ta không muốn hiển thị nó như EMPTY thông thường mà muốn merge nó.
                        if (
                          cIndex > 0 &&
                          row[cIndex - 1] === 'COUPLE' &&
                          cellType === 'EMPTY'
                        ) {
                          return null;
                        }

                        // Nếu là BED_BOTTOM, render một ô vô hình để giữ chỗ trong flex layout
                        if (cellType === 'BED_BOTTOM') {
                          return (
                            <div
                              key={`${rIndex}-${cIndex}`}
                              style={{
                                width: '36px',
                                height: '36px',
                                flexShrink: 0,
                              }}
                              onMouseDown={() =>
                                handleMouseDown(rIndex, cIndex)
                              }
                              onMouseEnter={() =>
                                handleMouseEnter(rIndex, cIndex)
                              }
                            />
                          );
                        }

                        let seatWidth = 36;
                        let seatHeight = 36;
                        if (cellType === 'COUPLE') {
                          seatWidth = 36 * 2 + 6;
                        }
                        if (cellType === 'BED') {
                          seatHeight = 65; // Vừa vặn hơn, không bị trồng lấp
                        }

                        return (
                          <div
                            key={`${rIndex}-${cIndex}`}
                            style={{
                              position: 'relative',
                              width: cellType === 'BED' ? '36px' : 'auto',
                              height: cellType === 'BED' ? '36px' : 'auto',
                              flexShrink: 0,
                            }}
                          >
                            <div
                              className={`seat-cell ${cellType !== 'EMPTY' ? 'is-seat' : ''}`}
                              style={{
                                position:
                                  cellType === 'BED' ? 'absolute' : 'relative',
                                top: 0,
                                left: 0,
                                width: `${seatWidth}px`,
                                height: `${seatHeight}px`,
                                zIndex: cellType === 'BED' ? 10 : 1,
                                flexShrink: 0,
                                backgroundColor: typeInfo.bg,
                                border: typeInfo.border,
                                color:
                                  cellType === 'EMPTY'
                                    ? 'transparent'
                                    : typeInfo.color,
                                boxShadow: typeInfo.shadow || 'none',
                                borderRadius: typeInfo.borderRadius || '8px',
                                '--hover-bg': typeInfo.hoverBg,
                              }}
                              onMouseDown={() =>
                                handleMouseDown(rIndex, cIndex)
                              }
                              onMouseEnter={() =>
                                handleMouseEnter(rIndex, cIndex)
                              }
                            >
                              {/* Hiển thị chữ cái và số ghế */}
                              {cellType !== 'EMPTY' && (
                                <span
                                  style={{ fontSize: '9px', fontWeight: 700 }}
                                >
                                  {displaySymbol}
                                  {
                                    row
                                      .slice(0, cIndex + 1)
                                      .filter(
                                        (c) =>
                                          c !== 'EMPTY' && c !== 'BED_BOTTOM'
                                      ).length
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-red-400" />

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[22px]">
                warning
              </span>
              Xác nhận thay đổi
            </h3>
            <p className="text-gray-400 text-[13.5px] mb-6 leading-relaxed">
              Thay đổi loại phòng sẽ đặt lại{' '}
              <span className="text-white font-semibold">
                toàn bộ sơ đồ ghế
              </span>{' '}
              hiện tại. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: false, newType: null })
                }
                className="px-4 py-2 text-[13px] font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  const newType = confirmModal.newType;
                  setRoomType(newType);
                  setSelectedTool(newType === 'LO_BED' ? 'BED' : 'NORMAL');
                  generateGrid(inputRows, inputCols, newType);
                  setConfirmModal({ isOpen: false, newType: null });
                }}
                className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:-translate-y-0.5"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
