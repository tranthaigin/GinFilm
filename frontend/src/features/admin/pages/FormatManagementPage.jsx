import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RotateCcw,
  MonitorPlay,
  Film,
  Layers,
  CheckCircle,
} from 'lucide-react';
import { movieFormatApi } from '../api/movieFormatApi';
import { useToastStore } from '../hooks/useToastStore';

const ROOM_TYPES = [
  { id: 'LO_RAP', name: 'LORAP' },
  { id: 'LO_BED', name: 'LOBED' },
  { id: 'LO_SCREEN_X', name: 'LOSCREENX' },
];

export default function FormatManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const [activeTab, setActiveTab] = useState('formats'); // 'formats' | 'mapping'

  // Format Data
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // Mapping Data
  const [activeRoomType, setActiveRoomType] = useState('LO_RAP');

  const fetchFormats = useCallback(() => {
    return movieFormatApi
      .getAll(showDeleted)
      .then((data) => {
        data.sort((a, b) => a.name.localeCompare(b.name));
        setFormats(data);
      })
      .catch((error) => {
        console.error('Error fetching formats:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showDeleted]);

  const loadKey301 = JSON.stringify([showDeleted]);
  const [previousLoadKey301, setPreviousLoadKey301] = useState(null);
  if (previousLoadKey301 !== loadKey301) {
    setPreviousLoadKey301(loadKey301);
    setLoading(true);
  }

  useEffect(() => {
    fetchFormats();
  }, [showDeleted, fetchFormats]);

  const addToast = useToastStore((state) => state.addToast);
  const showToast = (msg) => addToast({ message: msg, type: 'success' });

  // --- Format CRUD ---
  const handleAddFormat = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setLoading(true);
      await movieFormatApi.create({
        name: newName.trim(),
        supportedRoomTypes: [],
      });
      setNewName('');
      await ((...args) => {
        setLoading(true);
        return fetchFormats(...args);
      })();
      showToast('Đã thêm định dạng mới');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFormatName = async (id, currentSupportedRooms) => {
    if (!editName.trim()) return;
    try {
      setLoading(true);
      await movieFormatApi.update(id, {
        name: editName.trim(),
        supportedRoomTypes: currentSupportedRooms,
      });
      setEditingId(null);
      await ((...args) => {
        setLoading(true);
        return fetchFormats(...args);
      })();
      showToast('Đã cập nhật tên định dạng');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await movieFormatApi.softDelete(id);
      await ((...args) => {
        setLoading(true);
        return fetchFormats(...args);
      })();
      showToast('Đã xóa định dạng');
    } catch (error) {
      console.error(error);
    }
  };

  const handleRestore = async (id) => {
    try {
      await movieFormatApi.restore(id);
      await ((...args) => {
        setLoading(true);
        return fetchFormats(...args);
      })();
      showToast('Đã khôi phục định dạng');
    } catch (error) {
      console.error(error);
    }
  };

  // --- Mapping Logic ---
  const handleToggleRoomMapping = async (formatId) => {
    const format = formats.find((f) => f.id === formatId);
    if (!format) return;

    const currentRooms = format.supportedRoomTypes || [];
    let newRooms;

    if (currentRooms.includes(activeRoomType)) {
      newRooms = currentRooms.filter((r) => r !== activeRoomType);
    } else {
      newRooms = [...currentRooms, activeRoomType];
    }

    try {
      // Optimistic update
      setFormats((prev) =>
        prev.map((f) =>
          f.id === formatId ? { ...f, supportedRoomTypes: newRooms } : f
        )
      );
      await movieFormatApi.update(formatId, {
        name: format.name,
        supportedRoomTypes: newRooms,
      });
      showToast(
        `Đã cập nhật định dạng cho phòng ${ROOM_TYPES.find((r) => r.id === activeRoomType)?.name}`
      );
    } catch (error) {
      console.error(error);
      await ((...args) => {
        setLoading(true);
        return fetchFormats(...args);
      })(); // revert on error
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} color="#fff" />
          </div>
          <div>
            <h2
              style={{
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Quản lí Định Dạng Phim
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                margin: '2px 0 0 0',
              }}
            >
              Quản lí và phân bổ định dạng cho từng loại phòng
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('formats')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'formats'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-black/5 text-gray-600 hover:bg-black/10 hover:text-black dark:bg-white/5 dark:text-[#9D9D9D] dark:hover:bg-white/10 dark:hover:text-white'
          }`}
        >
          <Film size={18} /> Danh sách Định dạng
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'mapping'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-black/5 text-gray-600 hover:bg-black/10 hover:text-black dark:bg-white/5 dark:text-[#9D9D9D] dark:hover:bg-white/10 dark:hover:text-white'
          }`}
        >
          <MonitorPlay size={18} /> Phân bổ theo Loại Phòng
        </button>
      </div>

      {/* Tab Content: Formats */}
      {activeTab === 'formats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <form
              noValidate
              onSubmit={handleAddFormat}
              style={{
                display: 'flex',
                gap: '12px',
                flex: 1,
                maxWidth: '600px',
              }}
            >
              <input
                type="text"
                value={newName}
                onChange={(e) =>
                  setNewName(
                    e.target.value.replace(/[!@#$%^&*()_+={}[\]|\\<>/?~`]/g, '')
                  )
                }
                placeholder="Nhập tên định dạng mới (VD: 2D Phụ đề)..."
                className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10 rounded-[10px] p-[10px_16px] text-black dark:text-white outline-none focus:border-red-500 transition-colors"
              />
              <>
                {!isStaff && (
                  <button
                    type="submit"
                    disabled={loading || !newName.trim()}
                    className={`flex items-center gap-[8px] rounded-[10px] px-[24px] py-[10px] font-semibold border-none transition-all duration-200 ${
                      loading || !newName.trim()
                        ? 'bg-gray-200 text-gray-400 dark:bg-white/10 dark:text-white/40 cursor-not-allowed shadow-none'
                        : 'bg-[linear-gradient(135deg,#dc2626_0%,#ff4f72_100%)] text-white cursor-pointer shadow-[0_4px_12px_rgba(220,38,38,0.3)] hover:opacity-90'
                    }`}
                  >
                    <Plus size={18} /> Thêm mới
                  </button>
                )}
              </>
            </form>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleted(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  !showDeleted
                    ? 'bg-[#dc2626] text-white shadow-md shadow-red-500/20'
                    : 'bg-black/5 text-gray-600 hover:bg-black/10 hover:text-black dark:bg-white/5 dark:text-[#9D9D9D] dark:hover:bg-white/10 dark:hover:text-white'
                }`}
              >
                Đang dùng
              </button>
              <button
                onClick={() => setShowDeleted(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  showDeleted
                    ? 'bg-[#dc2626] text-white shadow-md shadow-red-500/20'
                    : 'bg-black/5 text-gray-600 hover:bg-black/10 hover:text-black dark:bg-white/5 dark:text-[#9D9D9D] dark:hover:bg-white/10 dark:hover:text-white'
                }`}
              >
                Gồm đã xóa
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {formats.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Chưa có định dạng nào
              </div>
            ) : (
              formats.map((f) => (
                <div
                  key={f.id}
                  style={{
                    background: f.isDeleted
                      ? 'rgba(239,68,68,0.05)'
                      : '#1a1a1a',
                    border: f.isDeleted
                      ? '1px solid rgba(239,68,68,0.2)'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {editingId === f.id ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) =>
                          setEditName(
                            e.target.value.replace(
                              /[!@#$%^&*()_+={}[\]|\\<>/?~`]/g,
                              ''
                            )
                          )
                        }
                        autoFocus
                        style={{
                          flex: 1,
                          background: '#000',
                          border: '1px solid #444',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#fff',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() =>
                          handleUpdateFormatName(f.id, f.supportedRoomTypes)
                        }
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0 12px',
                          cursor: 'pointer',
                        }}
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          background: '#333',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0 12px',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <h3
                          className={`m-0 text-base ${f.isDeleted ? 'text-gray-500 dark:text-white/40 line-through' : 'text-gray-900 dark:text-white'}`}
                        >
                          {f.name}
                        </h3>
                        <p
                          className={`mt-1 mb-0 text-xs ${f.isDeleted ? 'text-gray-400 dark:text-white/40' : 'text-gray-500 dark:text-white/60'}`}
                        >
                          ID: {f.id}
                        </p>
                      </div>

                      {!f.isDeleted ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              setEditingId(f.id);
                              setEditName(f.name);
                            }}
                            style={{
                              background: 'rgba(59,130,246,0.1)',
                              color: '#3b82f6',
                              border: 'none',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                              border: 'none',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRestore(f.id)}
                          style={{
                            background: 'rgba(245,158,11,0.1)',
                            color: '#f59e0b',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <RotateCcw size={14} /> Khôi phục
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Mapping */}
      {activeTab === 'mapping' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Room Types Sidebar */}
          <div
            style={{
              width: '280px',
              flexShrink: 0,
              background: '#141414',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Chọn Loại Phòng
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ROOM_TYPES.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomType(room.id)}
                  style={{
                    padding: '16px 20px',
                    background:
                      activeRoomType === room.id
                        ? 'rgba(220,38,38,0.1)'
                        : 'transparent',
                    border: 'none',
                    borderLeft:
                      activeRoomType === room.id
                        ? '4px solid #dc2626'
                        : '4px solid transparent',
                    color:
                      activeRoomType === room.id
                        ? '#fff'
                        : 'rgba(255,255,255,0.7)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: activeRoomType === room.id ? 700 : 500,
                    transition: 'all 0.2s',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          {/* Formats Grid for Mapping */}
          <div
            style={{
              flex: 1,
              background: '#141414',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '24px',
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>
                Định Dạng Chiếu tại{' '}
                <span style={{ color: '#dc2626' }}>
                  {ROOM_TYPES.find((r) => r.id === activeRoomType)?.name}
                </span>
              </h2>
              <p
                style={{
                  margin: '8px 0 0 0',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '14px',
                }}
              >
                Tick chọn các định dạng được phép chiếu trong loại phòng này.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '16px',
              }}
            >
              {formats.filter((f) => !f.isDeleted).length === 0 ? (
                <div
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontStyle: 'italic',
                    gridColumn: '1/-1',
                  }}
                >
                  Không có định dạng nào khả dụng. Hãy qua tab Danh sách để
                  thêm.
                </div>
              ) : (
                formats
                  .filter((f) => !f.isDeleted)
                  .map((f) => {
                    const isSelected = (f.supportedRoomTypes || []).includes(
                      activeRoomType
                    );
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleToggleRoomMapping(f.id)}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          background: isSelected
                            ? 'rgba(220,38,38,0.1)'
                            : '#1a1a1a',
                          border: isSelected
                            ? '1px solid rgba(220,38,38,0.5)'
                            : '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: isSelected
                              ? 'none'
                              : '2px solid rgba(255,255,255,0.2)',
                            background: isSelected ? '#dc2626' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <CheckCircle size={16} color="#fff" />}
                        </div>
                        <span
                          style={{
                            color: isSelected
                              ? '#fff'
                              : 'rgba(255,255,255,0.7)',
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: '15px',
                          }}
                        >
                          {f.name}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
