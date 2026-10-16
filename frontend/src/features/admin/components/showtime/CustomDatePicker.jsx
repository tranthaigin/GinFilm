import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';

const CustomDatePicker = ({
  startDate,
  endDate,
  onChange,
  disabled = false,
  dateStatusMap = {}, // { '2026-07-07': 'full', '2026-07-08': 'partial', '2026-07-09': 'none' }
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Track selection state: 0 = none, 1 = start selected, 2 = both selected
  const [selectionState, setSelectionState] = useState(0);
  const containerRef = useRef(null);

  const resetKey1 = JSON.stringify([startDate, endDate, isOpen]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    // If external state changes and we don't have start, reset selection
    if (!startDate && !endDate) {
      setSelectionState(0);
    } else if (startDate && !endDate) {
      setSelectionState(1);
    } else if (startDate && endDate) {
      setSelectionState(2);
    }

    // Sync current month view with start date if exists
    if (startDate && !isOpen) {
      setCurrentMonth(new Date(startDate));
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Adjust so Monday is 0, Sunday is 6
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    // Add empty slots for days before the 1st
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDateClick = (day) => {
    if (!day) return;

    const dayStr = formatDate(day);

    // Check if day is full or in past
    if (day < today || dateStatusMap[dayStr] === 'full') {
      return;
    }

    if (selectionState === 0 || selectionState === 2) {
      // Start new selection
      onChange(dayStr, '');
      setSelectionState(1);
    } else if (selectionState === 1) {
      // Complete selection
      if (dayStr < startDate) {
        onChange(dayStr, ''); // Selected day is before start, make it new start
      } else {
        onChange(startDate, dayStr);
        setSelectionState(2);
        setIsOpen(false); // Close on complete
      }
    }
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="relative w-full font-sans" ref={containerRef}>
      {/* Trigger Button */}
      <div
        className={`w-full bg-[#2a2a2a] border ${disabled ? 'border-[#333] opacity-50 cursor-not-allowed' : isOpen ? 'border-[#dc2626]' : 'border-[#444] hover:border-[#666]'} rounded-lg px-4 py-3 text-white flex justify-between items-center transition-colors ${!disabled && 'cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-[#9D9D9D]" />
          <span className={startDate ? 'text-white' : 'text-gray-500'}>
            {startDate
              ? endDate
                ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
                : `${formatDisplayDate(startDate)} - Đang chọn...`
              : 'Chọn khoảng ngày'}
          </span>
        </div>
        {(startDate || endDate) && !disabled && (
          <div
            className="p-1 hover:bg-[#333] rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onChange('', '');
              setSelectionState(0);
            }}
          >
            <X size={16} className="text-[#9D9D9D] hover:text-white" />
          </div>
        )}
      </div>

      {/* Dropdown Calendar */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-[60] w-[320px]">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 hover:bg-[#333] rounded-lg text-[#9D9D9D] hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="font-bold text-white">
              Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-[#333] rounded-lg text-[#9D9D9D] hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-gray-500 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-9"></div>;

              const dayStr = formatDate(day);
              const isPast = day < today;
              const status = dateStatusMap[dayStr]; // 'full' or 'partial' or undefined
              const isStart = startDate === dayStr;
              const isEnd = endDate === dayStr;
              const isInRange =
                startDate && endDate && dayStr > startDate && dayStr < endDate;

              const isFull = status === 'full';
              const isPartial = status === 'partial';
              const isDisabled = isPast || isFull;

              // Determine classes
              let baseClass =
                'h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors relative ';

              if (isDisabled) {
                baseClass += 'opacity-30 cursor-not-allowed text-[#9D9D9D] ';
              } else {
                baseClass += 'cursor-pointer hover:bg-[#333] text-[#9D9D9D] ';
              }

              if (isStart || isEnd) {
                baseClass =
                  'h-9 rounded-lg flex items-center justify-center text-sm font-bold bg-[#dc2626] text-white shadow-[0_0_10px_rgba(220,38,38,0.4)] relative ';
              } else if (isInRange) {
                baseClass =
                  'h-9 rounded-none flex items-center justify-center text-sm font-medium bg-[#dc2626]/20 text-white relative ';
                // Add rounding for first/last in row for range
                if (day.getDay() === 1) baseClass += 'rounded-l-lg ';
                if (day.getDay() === 0) baseClass += 'rounded-r-lg ';
              }

              return (
                <div
                  key={idx}
                  className={baseClass}
                  onClick={() => handleDateClick(day)}
                  title={
                    isFull
                      ? 'Ngày này đã tạo kín lịch cho tất cả phim'
                      : isPartial
                        ? 'Ngày này đã tạo lịch cho một số phim'
                        : ''
                  }
                >
                  <span className="relative z-10">{day.getDate()}</span>

                  {/* Status Indicators */}
                  {!isStart && !isEnd && !isInRange && !isPast && (
                    <>
                      {isFull && (
                        <div className="absolute inset-0 bg-blue-500/20 rounded-lg border border-blue-500/40"></div>
                      )}
                      {isPartial && (
                        <div className="absolute inset-0 bg-yellow-500/20 rounded-lg border border-yellow-500/40"></div>
                      )}
                    </>
                  )}
                  {/* Small dot for indication even if selected */}
                  {(isStart || isEnd || isInRange) && (
                    <>
                      {isFull && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-300"></div>
                      )}
                      {isPartial && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-yellow-300"></div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-[#333] flex items-center gap-4 text-[11px] text-[#9D9D9D]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500/20 border border-blue-500/40 rounded"></div>
              <span>Full phim</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500/40 rounded"></div>
              <span>Đã có phim</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
