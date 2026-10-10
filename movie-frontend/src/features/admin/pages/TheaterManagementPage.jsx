import { MonitorPlay, Plus, Search, RefreshCw, MapPin, Tv2, Users, Pencil, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheaterManagement } from '../hooks/useTheaterManagement';
import TheaterFormModal from '../components/theater/TheaterFormModal';

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonItem({ height = 72, width = '100%' }) {
  return (
    <div style={{
      height, width,
      borderRadius: '10px',
      background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      flexShrink: 0,
    }} />
  );
}

// ─── Room type color mapping ──────────────────────────────────────────────────
const ROOM_TYPE_COLORS = {
  IMAX: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  '4DX': { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  ScreenX: { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: 'rgba(20,184,166,0.3)' },
  Dolby: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  '3D': { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  '2D': { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)' },
};
function getRoomTypeStyle(roomType) {
  if (!roomType) return ROOM_TYPE_COLORS['2D'];
  const key = Object.keys(ROOM_TYPE_COLORS).find(
    (k) => roomType.toUpperCase().includes(k.toUpperCase())
  );
  return ROOM_TYPE_COLORS[key] || ROOM_TYPE_COLORS['2D'];
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', padding: '8px 12px 8px 32px',
          fontSize: '12px', color: '#fff', outline: 'none',
          fontFamily: '"Inter",sans-serif', transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(220,38,38,0.5)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
    </div>
  );
}

// ─── Province tab chip ────────────────────────────────────────────────────────
function ProvinceTab({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${isActive
          ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)] border border-transparent'
          : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white border border-transparent'
        }`}
    >
      {label}
    </button>
  );
}

// ─── Theater chip ─────────────────────────────────────────────────────────────
function TheaterChip({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg text-sm font-semibold transition-all min-h-[40px] break-words whitespace-normal ${isActive
          ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)] border border-transparent'
          : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white border border-transparent'
        }`}
    >
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TheaterManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const navigate = useNavigate();
  const {
    provinces,
    filteredProvinces,
    filteredTheaters,
    filteredRooms,
    selectedProvince,
    selectedTheater,
    loadingProvinces,
    loadingRooms,
    provinceSearch, setProvinceSearch,
    theaterSearch, setTheaterSearch,
    roomSearch, setRoomSearch,
    handleSelectProvince,
    handleSelectTheater,
    theaterModalOpen, editingTheater, openAddTheater, openEditTheater, closeTheaterModal, saveTheater,
    roomModalOpen, editingRoom, openAddRoom, openEditRoom, closeRoomModal, saveRoom, toggleRoom,
    fetchProvinces,
  } = useTheaterManagement();

  const totalTheaters = provinces.reduce((acc, p) => acc + (p.theaters?.length || 0), 0);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .room-card-row {
          background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .room-card-row:hover {
          background: linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%) !important;
          border-color: rgba(255,255,255,0.2) !important;
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ══════════════════ PAGE HEADER ══════════════════ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '13px',
              background: 'linear-gradient(135deg,#dc2626 0%,#ff4b72 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(220,38,38,0.35)',
            }}>
              <MonitorPlay size={22} color="#fff" />
            </div>
            <div>
              <h2 className="text-white" style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Quản lí Rạp Chiếu
              </h2>
              <p className="text-white/40" style={{ fontSize: '13px', margin: '3px 0 0 0' }}>
                {provinces.length} cụm rạp &nbsp;·&nbsp; {totalTheaters} rạp chiếu
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button" onClick={fetchProvinces} title="Làm mới"
              style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <RefreshCw size={15} />
            </button>
            <>{!isStaff && (
              <button
                type="button" id="btn-add-theater" onClick={openAddTheater}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#dc2626 0%,#ff4b72 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter",sans-serif', boxShadow: '0 4px 16px rgba(220,38,38,0.3)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,38,38,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.3)'; }}
              >
                <Plus size={15} /> Thêm rạp
              </button>
            )}</>
          </div>
        </div>

        {/* ══════════════════ SELECTOR CARD ══════════════════ */}
        <div style={{
          background: '#0e0e0e',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '18px 20px',
        }}>
          {/* ── Row 1: Province tabs ── */}
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={10} /> Cụm rạp / Tỉnh - Thành phố
          </p>

          {loadingProvinces ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4, 5].map(i => <SkeletonItem key={i} height={34} width={100} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <ProvinceTab
                label="Tất cả"
                isActive={!selectedProvince}
                onClick={() => selectedProvince && handleSelectProvince(selectedProvince)}
              />
              {filteredProvinces.map((province) => (
                <ProvinceTab
                  key={province.id}
                  label={province.name}
                  isActive={selectedProvince?.id === province.id}
                  onClick={() => handleSelectProvince(province)}
                />
              ))}
            </div>
          )}

          {/* ── Row 2: Theater search & chips ── */}
          {filteredTheaters.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', maxWidth: '300px', background: '#1a1a1a', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search size={16} color="rgba(255,255,255,0.4)" />
                <input
                  type="text"
                  placeholder="Tìm kiếm rạp theo tên..."
                  value={theaterSearch}
                  onChange={(e) => setTheaterSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '13px', width: '100%' }}
                />
              </div>

              <div style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {filteredTheaters.map((theater) => (
                    <TheaterChip
                      key={theater.id}
                      label={theater.name}
                      isActive={selectedTheater?.id === theater.id}
                      onClick={() => handleSelectTheater(theater)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty state khi province chưa có rạp */}
          {!loadingProvinces && selectedProvince && filteredTheaters.length === 0 && (
            <div className="text-white/30" style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
              Cụm rạp này chưa có rạp chiếu nào.
            </div>
          )}
        </div>

        {/* ══════════════════ ROOM PANEL (full-width) ══════════════════ */}
        <div style={{
          background: '#0e0e0e',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          overflow: 'hidden',
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Panel header */}
          <div style={{
            padding: '16px 20px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <Tv2 size={15} color="#6366f1" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="text-white" style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                    Phòng chiếu
                  </h3>
                  {selectedTheater && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px',
                      background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.25)',
                    }}>
                      {filteredRooms.length}
                    </span>
                  )}
                </div>
                {selectedTheater && (
                  <p className="text-white/30" style={{ fontSize: '11px', margin: '2px 0 0 0' }}>
                    {selectedTheater.name}
                    {selectedTheater.address && (
                      <span style={{ marginLeft: '8px' }}>· {selectedTheater.address}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              {/* Search chỉ hiện khi có rạp được chọn */}
              {selectedTheater && (
                <div style={{ width: '220px' }}>
                  <SearchBar value={roomSearch} onChange={setRoomSearch} placeholder="Tìm phòng chiếu..." />
                </div>
              )}
              {/* Nút thêm phòng chỉ hiện khi đã chọn rạp */}
              {selectedTheater && (
                <>{!isStaff && (
                  <button
                    type="button" id="btn-add-room" onClick={() => navigate(`${selectedTheater.id}/rooms/new`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter",sans-serif', boxShadow: '0 3px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                  >
                    <Plus size={13} /> Thêm phòng
                  </button>
                )}</>
              )}
            </div>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
            {/* State: chưa chọn rạp */}
            {!selectedTheater && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '14px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tv2 size={26} color="rgba(99,102,241,0.7)" />
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Chọn rạp chiếu</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0, textAlign: 'center', maxWidth: '240px', lineHeight: 1.6 }}>
                  Chọn một tỉnh/thành phố, sau đó nhấn vào tên rạp bên trên để xem danh sách phòng chiếu.
                </p>
              </div>
            )}

            {/* State: đang tải */}
            {selectedTheater && loadingRooms && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonItem key={i} height={76} />)}
              </div>
            )}

            {/* State: không có phòng */}
            {selectedTheater && !loadingRooms && filteredRooms.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '14px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tv2 size={26} color="rgba(34,197,94,0.7)" />
                </div>
                <p className="text-white/40" style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Chưa có phòng chiếu</p>
                <p className="text-white/30" style={{ fontSize: '12px', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                  Rạp này chưa có phòng nào. Nhấn "+ Thêm phòng" để tạo mới.
                </p>
              </div>
            )}

            {/* State: danh sách phòng */}
            {selectedTheater && !loadingRooms && filteredRooms.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {filteredRooms.map((room) => {
                  const typeStyle = getRoomTypeStyle(room.roomType);
                  return (
                    <div
                      key={room.id}
                      className="room-card-row"
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '178px',
                        padding: '18px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
                        overflow: 'hidden',
                        cursor: 'default'
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: '18px', right: '18px', height: '2px', background: `linear-gradient(90deg, transparent, ${typeStyle.color}, transparent)`, opacity: 0.7 }} />

                      {/* Icon và trạng thái */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0, background: typeStyle.bg, border: `1px solid ${typeStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Tv2 size={19} color={typeStyle.color} />
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: room.isActive !== false ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: room.isActive !== false ? '#4ade80' : '#f87171',
                          border: `1px solid ${room.isActive !== false ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {room.isActive !== false ? 'Hoạt động' : 'Bảo trì'}
                        </span>
                      </div>

                      {/* Tên phòng có vùng riêng, không bị nút thao tác che */}
                      <div style={{ marginTop: '14px', minHeight: '44px' }}>
                        <p className="text-white" style={{ fontSize: '17px', lineHeight: 1.35, fontWeight: 800, margin: 0, overflowWrap: 'anywhere' }}>
                          {room.name}
                        </p>
                      </div>

                      {/* Thông tin phòng */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 12px', marginTop: '7px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          {room.roomType || '2D'}
                        </span>
                        <span className="text-white/60" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          <Users size={13} /> {room.capacity} ghế
                        </span>
                      </div>

                      {/* Thao tác luôn nằm ở chân thẻ */}
                      <div className="grid grid-cols-2 gap-2 mt-auto pt-[15px] border-t border-gray-200 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => navigate(`${selectedTheater.id}/rooms/${room.id}/edit`)}
                          title="Sửa phòng"
                          className="h-[34px] rounded-lg border flex items-center justify-center gap-1.5 text-[11px] font-bold transition-all duration-150 bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-700 hover:shadow-md dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-500/30 dark:hover:text-indigo-400"
                        >
                          <Pencil size={13} /> Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          title={room.isActive !== false ? "Ẩn phòng (Xoá mềm)" : "Hiện phòng"}
                          onClick={() => toggleRoom(room)}
                          className="h-[34px] rounded-lg border flex items-center justify-center gap-1.5 text-[11px] font-bold transition-all duration-150 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 hover:text-red-700 hover:shadow-md dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/20 dark:hover:border-red-500/30 dark:hover:text-red-400"
                        >
                          <EyeOff size={13} /> {room.isActive !== false ? 'Ẩn phòng' : 'Hiện phòng'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ─── */}
      <TheaterFormModal
        isOpen={theaterModalOpen}
        onClose={closeTheaterModal}
        onSave={saveTheater}
        editingTheater={editingTheater}
        provinces={provinces}
      />
    </>
  );
}
