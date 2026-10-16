import { useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, CheckSquare, Square } from 'lucide-react';
import { movieApi } from '../api/movieApi';
import { theaterApi } from '../api/theaterApi';
import { useProvinces } from '../../user/hooks/useProvinces';

export default function CreateShowtimePage({ onBack, onSave }) {
  useLocation().pathname.startsWith('/staff');

  const [formData, setFormData] = useState({
    movieId: '',
    format: '',
    startDate: '',
    endDate: '',
    openingTime: '08:00',
    lastShowtime: '22:00',
    isHidden: false,
  });

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverValidationError, setValidationError] = useState('');
  const [validationClock, setValidationClock] = useState(() => new Date());

  // Regions & Cinemas using useProvinces hook
  const { provinces, activeProvinceId, setActiveProvinceId } =
    useProvinces(false);

  const [selectedTheaterIds, setSelectedTheaterIds] = useState([]);
  const [theaterRooms, setTheaterRooms] = useState({}); // { [theaterId]: roomsArray }
  const [selectedRooms, setSelectedRooms] = useState({}); // { [theaterId]: roomId }
  const [excludedDates, setExcludedDates] = useState([]);

  function fetchMovies() {
    return movieApi
      .getAll()
      .then((moviesData) => {
        setMovies(
          moviesData.filter(
            (m) =>
              !m.isHidden &&
              m.isCinemaAvailable &&
              (m.status === 'NOW_SHOWING' || m.status === 'showing')
          )
        );
      })
      .catch((error) => {
        console.error(error);
      });
  }

  useEffect(() => {
    fetchMovies();
  }, []);

  // Fetch rooms when theaters are selected
  useEffect(() => {
    const fetchRoomsForSelectedTheaters = async () => {
      for (const tId of selectedTheaterIds) {
        if (!theaterRooms[tId]) {
          try {
            const roomsData = await theaterApi.getRoomsByTheater(tId);
            const activeRooms = roomsData.filter((r) => r.isActive);
            setTheaterRooms((prev) => ({
              ...prev,
              [tId]: activeRooms,
            }));
            if (activeRooms.length > 0) {
              setSelectedRooms((prev) => ({
                ...prev,
                [tId]: activeRooms[0].id.toString(),
              }));
            }
          } catch (error) {
            console.error('Error fetching rooms:', error);
          }
        }
      }
    };
    fetchRoomsForSelectedTheaters();
  }, [selectedTheaterIds, theaterRooms]);

  const selectedMovie = movies.find((m) => m.id === Number(formData.movieId));
  const baseFormats = selectedMovie?.formats?.map((f) => f.name) || [
    '2D Phụ đề',
  ];

  // Default format selection
  const resetKey1 = JSON.stringify([baseFormats, formData.format]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    if (baseFormats.length > 0 && !baseFormats.includes(formData.format)) {
      setFormData((prev) => ({ ...prev, format: baseFormats[0] }));
    }
  }

  // Validation
  const fieldValidationError = useMemo(() => {
    let error = '';
    const today = validationClock;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      error = 'Ngày bắt đầu không được lớn hơn ngày kết thúc.';
    } else if (
      formData.openingTime &&
      formData.lastShowtime &&
      formData.openingTime >= formData.lastShowtime
    ) {
      error = 'Giờ bắt đầu phải nhỏ hơn giờ chiếu cuối cùng.';
    } else if (
      formData.startDate === todayStr &&
      formData.openingTime &&
      formData.openingTime < currentTime
    ) {
      error = 'Giờ bắt đầu không được nằm trong quá khứ.';
    }

    return error;
  }, [
    formData.startDate,
    formData.endDate,
    formData.openingTime,
    formData.lastShowtime,
    validationClock,
  ]);
  const validationError = fieldValidationError || serverValidationError;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValidationClock(new Date());
    setValidationError('');
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleTheaterSelect = (id) => {
    setSelectedTheaterIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  };

  const activeProvince = provinces.find((p) => p.id === activeProvinceId);
  activeProvince ? activeProvince.theaters.map((t) => t.id) : [];

  const handleSelectAllCinemas = () => {
    const allTheaterIds = provinces.flatMap((p) => p.theaters.map((t) => t.id));
    const allSelected = allTheaterIds.every((id) =>
      selectedTheaterIds.includes(id)
    );
    if (allSelected) {
      setSelectedTheaterIds([]);
    } else {
      setSelectedTheaterIds(allTheaterIds);
    }
  };

  const allDatesInRange = [];
  if (
    formData.startDate &&
    formData.endDate &&
    formData.startDate <= formData.endDate
  ) {
    let curr = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    while (curr <= end) {
      allDatesInRange.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
  }

  const toggleExcludeDate = (dateStr) => {
    setExcludedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const formatDateForUI = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)}/${parseInt(m)}/${y}`;
  };

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationClock(new Date());
    if (validationError || selectedTheaterIds.length === 0) return;

    setLoading(true);

    // Generate dates
    const dates = [];
    let curr = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      if (!excludedDates.includes(dateStr)) {
        dates.push(dateStr);
      }
      curr.setDate(curr.getDate() + 1);
    }

    const requests = [];

    for (const date of dates) {
      for (const tId of selectedTheaterIds) {
        const roomId = Number(selectedRooms[tId]);
        const rooms = theaterRooms[tId] || [];
        const room = rooms.find((r) => r.id === roomId);
        if (!room) continue;

        let suffix = '';
        if (room.roomType === 'LO_RAP') suffix = ' - LORAP';
        else if (room.roomType === 'LO_BED') suffix = ' - LOBED';
        else if (room.roomType === 'LO_SCREEN_X') suffix = ' - LOSCREENX';

        requests.push({
          theaterId: Number(tId),
          movieId: Number(formData.movieId),
          roomId: roomId,
          showDate: date,
          startTime: formData.openingTime,
          endTime: formData.lastShowtime,
          format: `${formData.format}${suffix}`,
          isHidden: formData.isHidden,
        });
      }
    }

    if (requests.length === 0) {
      setValidationError(
        'Không tạo được suất chiếu nào với cấu hình hiện tại.'
      );
      setLoading(false);
      return;
    }

    try {
      await onSave(requests);
    } catch (error) {
      setValidationError(
        error.message || 'Không thể lưu suất chiếu. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#141414',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2
          style={{
            color: '#fff',
            fontSize: '20px',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Thêm suất chiếu mới (Tự động tạo hàng loạt)
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#141414',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Task 1: Cinema Selection UI */}
        <div>
          <label
            style={{
              display: 'block',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            Chọn rạp chiếu phim
          </label>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Region Tabs */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {provinces.map((p) => {
                const theatersInProv = p.theaters || [];
                const selectedCount = theatersInProv.filter((t) =>
                  selectedTheaterIds.includes(t.id)
                ).length;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setActiveProvinceId(p.id)}
                    className={`px-4 py-2 rounded-[20px] text-[13px] font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      activeProvinceId === p.id
                        ? 'bg-red-50 dark:bg-[#dc2626]/10 text-red-600 dark:text-[#dc2626] border border-red-600 dark:border-[#dc2626]'
                        : 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-[#a1a1aa] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#333]'
                    }`}
                  >
                    {p.name}
                    {selectedCount > 0 && (
                      <span
                        style={{
                          background: '#dc2626',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          lineHeight: '16px',
                        }}
                      >
                        {selectedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Select All Button */}
            {(() => {
              const allTheaterIds = provinces.flatMap((p) =>
                (p.theaters || []).map((t) => t.id)
              );
              const isAllSelected =
                allTheaterIds.length > 0 &&
                allTheaterIds.every((id) => selectedTheaterIds.includes(id));
              return (
                <button
                  type="button"
                  onClick={handleSelectAllCinemas}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: isAllSelected ? '#dc2626' : '#333',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả Rạp'}
                </button>
              );
            })()}
          </div>

          {/* Cinema Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              maxHeight: '250px',
              overflowY: 'auto',
              padding: '4px',
              background: '#1c1c1c',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {activeProvince ? (
              activeProvince.theaters.map((t) => {
                const isSelected = selectedTheaterIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTheaterSelect(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      background: isSelected ? 'rgba(220,38,38,0.05)' : '#222',
                      border: isSelected
                        ? '1px solid #dc2626'
                        : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div
                      style={{
                        color: isSelected ? '#dc2626' : 'rgba(255,255,255,0.3)',
                        marginTop: '2px',
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </div>
                    <div>
                      <h4
                        style={{
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          margin: '0 0 4px 0',
                        }}
                      >
                        {t.name}
                      </h4>
                      <p
                        style={{
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '11px',
                          margin: 0,
                          lineHeight: '1.4',
                        }}
                      >
                        {t.address}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '20px',
                  gridColumn: 'span 3',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Vui lòng chọn khu vực ở trên
              </div>
            )}
          </div>
        </div>

        {/* Task 3: Room Selection & Room Type Display */}
        {selectedTheaterIds.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '16px',
              borderRadius: '12px',
              background: '#181818',
            }}
          >
            <label style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
              Cấu hình phòng chiếu cho rạp đã chọn
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {selectedTheaterIds.map((tId) => {
                const p = provinces.find((prov) =>
                  prov.theaters.some((th) => th.id === tId)
                );
                const theater = p?.theaters.find((th) => th.id === tId);
                const rooms = theaterRooms[tId] || [];
                const selectedRoomId = selectedRooms[tId] || '';
                rooms.find((r) => r.id === Number(selectedRoomId));

                return (
                  <div
                    key={tId}
                    style={{
                      background: '#222',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {theater?.name}
                    </span>
                    <select
                      value={selectedRoomId}
                      onChange={(e) =>
                        setSelectedRooms((prev) => ({
                          ...prev,
                          [tId]: e.target.value,
                        }))
                      }
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#2a2a2a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- Chọn phòng --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {r.roomType ? ` - ${r.roomType}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                marginBottom: '8px',
              }}
            >
              Phim
            </label>
            <select
              name="movieId"
              value={formData.movieId}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a2a2a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
              }}
            >
              <option value="">-- Chọn phim --</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                marginBottom: '8px',
              }}
            >
              Định dạng
            </label>
            <select
              name="format"
              value={formData.format}
              onChange={handleChange}
              required
              disabled={!formData.movieId}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a2a2a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
              }}
            >
              <option value="">-- Chọn định dạng --</option>
              {baseFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>

          {/* Task 2: Time Range UI */}
          <div style={{ display: 'flex', gap: '10px', gridColumn: 'span 2' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                Ngày bắt đầu
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                min={todayStr}
                max={formData.endDate || ''}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2a2a2a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                Ngày kết thúc
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                min={formData.startDate || todayStr}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2a2a2a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                Giờ bắt đầu
              </label>
              <input
                type="time"
                name="openingTime"
                value={formData.openingTime}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2a2a2a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                Giờ chiếu cuối cùng
              </label>
              <input
                type="time"
                name="lastShowtime"
                value={formData.lastShowtime}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2a2a2a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {allDatesInRange.length > 0 && (
            <div style={{ gridColumn: 'span 2', marginTop: '12px' }}>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '14px',
                  marginBottom: '12px',
                }}
              >
                Bỏ chọn các ngày nghỉ (tùy chọn)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {allDatesInRange.map((dateStr) => {
                  const isExcluded = excludedDates.includes(dateStr);
                  return (
                    <button
                      type="button"
                      key={dateStr}
                      onClick={() => toggleExcludeDate(dateStr)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: isExcluded
                          ? '#2a2a2a'
                          : 'rgba(220,38,38,0.1)',
                        color: isExcluded ? '#666' : '#dc2626',
                        border: isExcluded
                          ? '1px solid rgba(255,255,255,0.1)'
                          : '1px solid #dc2626',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      {formatDateForUI(dateStr)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {validationError && (
            <div
              style={{
                gridColumn: 'span 2',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {validationError}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={
              loading || !!validationError || selectedTheaterIds.length === 0
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background:
                selectedTheaterIds.length === 0
                  ? '#444'
                  : 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor:
                selectedTheaterIds.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={18} />
            {loading ? 'Đang lưu...' : 'Lưu suất chiếu'}
          </button>
        </div>
      </form>
    </div>
  );
}
