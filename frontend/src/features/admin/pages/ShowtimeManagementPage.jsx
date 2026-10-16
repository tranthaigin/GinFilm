import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Plus,
  Zap,
  AlertTriangle,
  X,
  Edit,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import CreateShowtimePage from './CreateShowtimePage';
import { useShowtimeManagement } from '../hooks/useShowtimeManagement';
import { theaterApi, movieApi, genreApi } from '../api';
import { useProvinces } from '../../user/hooks/useProvinces';
import { movieFormatApi } from '../api/movieFormatApi';
import { useToastStore } from '../hooks/useToastStore';
import Pagination from '../../../shared/components/Pagination';

const isPastShowtime = (showDate, startTime) => {
  if (!showDate || !startTime) return false;
  const now = new Date();
  const showDateTime = new Date(`${showDate}T${startTime}`);
  return showDateTime < now;
};

export default function ShowtimeManagementPage() {
  const {
    showtimes,
    totalPages,
    totalElements,
    loading,
    fetchShowtimes,
    addShowtime,
    toggleShowtimeVisibility,
    deleteAllShowtimes,
    updateFormat,
    updateShowtime,
  } = useShowtimeManagement();
  const [viewState, setViewState] = useState({ mode: 'list', showtime: null });
  const [statusTab, setStatusTab] = useState('active');
  const navigate = useNavigate();
  const location = useLocation();
  const isStaff = location.pathname.startsWith('/staff');
  const addToast = useToastStore((state) => state.addToast);
  const lastSuccessMessage = useRef(null);
  const { provinces, activeProvinceId, setActiveProvinceId } =
    useProvinces(false);
  const [filterTheater, setFilterTheater] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMovie, setFilterMovie] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  const [filterFormat, setFilterFormat] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [theaters, setTheaters] = useState([]);
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [, setPageInputVal] = useState('1');

  const resetKey1 = JSON.stringify([currentPage]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    setPageInputVal(currentPage.toString());
  }

  // Delete Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Edit Modal
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editRooms, setEditRooms] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  const [availableFormats, setAvailableFormats] = useState([]);

  const FORMAT_OPTIONS = availableFormats.map((f) => f.name);

  const handleFormatChange = async (id, newFormat) => {
    await updateFormat(id, newFormat);
  };

  const handleEditClick = async (st) => {
    setEditingShowtime(st);
    setEditFormData({
      movieId: st.movieId?.toString() || '',
      roomId: st.roomId?.toString() || '',
      showDate: st.showDate || '',
      startTime: st.startTime || '',
      endTime: st.endTime || '',
      format: st.format || '2D Phụ đề',
    });
    // Load rooms for the theater
    if (st.theaterId) {
      try {
        const roomsData = await theaterApi.getRoomsByTheater(st.theaterId);
        setEditRooms(roomsData.filter((r) => r.isActive));
      } catch (e) {
        console.error('Error loading rooms for edit:', e);
        setEditRooms([]);
      }
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (
      editFormData.startTime &&
      editFormData.endTime &&
      editFormData.startTime >= editFormData.endTime
    ) {
      addToast({
        message: 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc.',
        type: 'error',
      });
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    if (
      editFormData.showDate === todayStr &&
      editFormData.startTime &&
      editFormData.startTime < currentTime
    ) {
      addToast({
        message: 'Giờ bắt đầu không được nằm trong quá khứ.',
        type: 'error',
      });
      return;
    }

    setEditSaving(true);
    const payload = {
      movieId: editFormData.movieId ? Number(editFormData.movieId) : null,
      roomId: editFormData.roomId ? Number(editFormData.roomId) : null,
      showDate: editFormData.showDate || null,
      startTime: editFormData.startTime || null,
      endTime: editFormData.endTime || null,
      format: editFormData.format || null,
    };
    const result = await updateShowtime(editingShowtime.id, payload);
    setEditSaving(false);
    if (result.success) {
      setEditingShowtime(null);
    }
  };

  function loadInitialData() {
    return Promise.all([
      theaterApi.getAllTheaters(),
      movieApi.getAll(),
      genreApi.getAll(),
    ])
      .then(([tData, mData, gData]) => {
        setTheaters(tData);
        setMovies(mData);
        setGenres(gData.map((g) => g.name).sort());
      })
      .catch((e) => {
        console.error(e);
      });
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  function loadFormats() {
    return movieFormatApi
      .getAll()
      .then((data) => {
        setAvailableFormats(data);
      })
      .catch((error) => {
        console.error('Failed to load formats', error);
      });
  }

  useEffect(() => {
    loadFormats();
  }, []);

  useEffect(() => {
    if (
      location.state?.successMessage &&
      location.state.successMessage !== lastSuccessMessage.current
    ) {
      addToast({ message: location.state.successMessage, type: 'success' });
      lastSuccessMessage.current = location.state.successMessage;
      // Clear the state so it doesn't show again on reload
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate, addToast]);

  const confirmDeleteSingle = async () => {
    if (deleteTargetId) {
      // await deleteShowtime(deleteTargetId); // Backend hasn't implemented delete single yet, only toggle hide
    }
    setDeleteTargetId(null);
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const confirmDeleteAll = async () => {
    setIsDeletingAll(true);
    await deleteAllShowtimes();
    setIsDeletingAll(false);
    setShowDeleteConfirm(false);
    setCurrentPage(1);
  };

  useEffect(() => {
    // Whenever filters or pagination change, fetch from backend
    fetchShowtimes({
      theaterId: filterTheater || undefined,
      movieId: filterMovie || undefined,
      roomId: filterRoom || undefined,
      genre: filterGenre || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      startTime: filterStartTime || undefined,
      endTime: filterEndTime || undefined,
      format: filterFormat || undefined,
      statusTab,
      page: currentPage - 1, // backend is 0-indexed
      size: itemsPerPage,
    });
  }, [
    filterTheater,
    filterStartDate,
    filterEndDate,
    filterMovie,
    filterGenre,
    filterStartTime,
    filterEndTime,
    filterFormat,
    filterRoom,
    statusTab,
    currentPage,
    fetchShowtimes,
  ]);

  // When filters change, reset to page 1
  const resetKey2 = JSON.stringify([
    filterTheater,
    filterStartDate,
    filterEndDate,
    filterMovie,
    filterGenre,
    filterStartTime,
    filterEndTime,
    filterFormat,
    filterRoom,
    statusTab,
  ]);
  const [previousResetKey2, setPreviousResetKey2] = useState(null);
  if (previousResetKey2 !== resetKey2) {
    setPreviousResetKey2(resetKey2);
    setCurrentPage(1);
  }

  // Paginated data from backend
  const paginatedShowtimes = showtimes || [];

  // Extract rooms for dropdown (Since showtimes is now only 1 page, this might only show rooms of the current page.
  // Ideally, rooms should come from backend room list, but for now we keep it compatible with existing logic)
  const filterableRooms = [
    ...new Map(
      (showtimes || []).map((st) => [
        st.roomId,
        { id: st.roomId, name: st.roomName },
      ])
    ).values(),
  ];

  const filteredTheaters = activeProvinceId
    ? theaters.filter((t) => t.provinceId === activeProvinceId)
    : theaters;

  if (viewState.mode === 'create') {
    return (
      <CreateShowtimePage
        onBack={() => setViewState({ mode: 'list', showtime: null })}
        onSave={async (formData) => {
          const result = await addShowtime(formData);
          if (result.success) {
            setViewState({ mode: 'list', showtime: null });
          }
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
      }}
    >
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '450px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  padding: '12px',
                  borderRadius: '50%',
                }}
              >
                <AlertTriangle size={32} color="#ef4444" />
              </div>
              <h3 style={{ color: '#fff', fontSize: '20px', margin: 0 }}>
                Cảnh báo hệ thống
              </h3>
            </div>

            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                lineHeight: '1.6',
                marginBottom: '30px',
              }}
            >
              Bạn có chắc chắn muốn xóa <strong>TOÀN BỘ</strong> suất chiếu
              trong hệ thống? Hành động này sẽ xóa dữ liệu vĩnh viễn và không
              thể hoàn tác!
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid #444',
                  background: 'transparent',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteAll}
                disabled={isDeletingAll}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: isDeletingAll ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  transition: 'background 0.2s',
                  opacity: isDeletingAll ? 0.7 : 1,
                }}
                onMouseOver={(e) =>
                  !isDeletingAll &&
                  (e.currentTarget.style.background = '#dc2626')
                }
                onMouseOut={(e) =>
                  !isDeletingAll &&
                  (e.currentTarget.style.background = '#ef4444')
                }
              >
                {isDeletingAll ? 'Đang xóa...' : 'Vâng, Xóa Tất Cả'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '450px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  padding: '12px',
                  borderRadius: '50%',
                }}
              >
                <AlertTriangle size={32} color="#ef4444" />
              </div>
              <h3 style={{ color: '#fff', fontSize: '20px', margin: 0 }}>
                Xóa suất chiếu này?
              </h3>
            </div>

            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                lineHeight: '1.6',
                marginBottom: '30px',
              }}
            >
              Hành động này có thể được khôi phục sau.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setDeleteTargetId(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid #444',
                  background: 'transparent',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteSingle}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#dc2626')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#ef4444')
                }
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Showtime Modal */}
      {editingShowtime && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '30px',
              width: '100%',
              maxWidth: '600px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background:
                      'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit size={20} color="#fff" />
                </div>
                <h3
                  style={{
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  Chỉnh sửa suất chiếu
                </h3>
              </div>
              <button
                onClick={() => setEditingShowtime(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              noValidate
              onSubmit={handleEditSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    Phim
                  </label>
                  <select
                    name="movieId"
                    value={editFormData.movieId}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#2a2a2a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">-- Chọn phim --</option>
                    {movies
                      .filter(
                        (m) =>
                          !m.isHidden &&
                          m.isCinemaAvailable &&
                          (m.status === 'NOW_SHOWING' || m.status === 'showing')
                      )
                      .map((m) => (
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
                      marginBottom: '6px',
                    }}
                  >
                    Phòng chiếu
                  </label>
                  <select
                    name="roomId"
                    value={editFormData.roomId}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#2a2a2a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">-- Chọn phòng --</option>
                    {editRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
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
                      marginBottom: '6px',
                    }}
                  >
                    Ngày chiếu
                  </label>
                  <input
                    type="date"
                    name="showDate"
                    value={editFormData.showDate}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#2a2a2a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    Định dạng
                  </label>
                  <select
                    name="format"
                    value={editFormData.format}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#2a2a2a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                  >
                    {FORMAT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
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
                      marginBottom: '6px',
                    }}
                  >
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={editFormData.startTime}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#2a2a2a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    Giờ kết thúc
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={editFormData.endTime}
                    onChange={handleEditChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#2a2a2a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingShowtime(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #444',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = '#333')
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: editSaving ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    opacity: editSaving ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <Save size={16} />
                  {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
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
            <Calendar size={22} color="#fff" />
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
              Quản lí Suất Chiếu
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                margin: '2px 0 0 0',
              }}
            >
              {totalElements} suất chiếu tìm thấy
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {!isStaff && (
            <button
              onClick={() => navigate('/admin/showtimes/auto')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 8px 25px rgba(16, 185, 129, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 15px rgba(16, 185, 129, 0.3)';
              }}
            >
              <Zap size={18} style={{ fill: 'currentColor' }} /> Tự Động Xếp
              Lịch
            </button>
          )}

          {!isStaff && (
            <button
              onClick={() => setViewState({ mode: 'create', showtime: null })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={16} /> Thêm suất chiếu
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatusTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            statusTab === 'active'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Đang hoạt động
        </button>
        <button
          onClick={() => setStatusTab('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            statusTab === 'inactive'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Đã chiếu / Đã ẩn
        </button>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#141414',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px',
        }}
      >
        {/* Row 0: Province Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '0px',
            overflowX: 'auto',
          }}
          className="custom-scrollbar"
        >
          <button
            onClick={() => {
              setActiveProvinceId(null);
              setFilterTheater('');
              setFilterRoom('');
            }}
            style={{
              padding: '10px 16px',
              background: activeProvinceId === null ? '#2a2a2a' : 'transparent',
              color: activeProvinceId === null ? '#dc2626' : '#9ca3af',
              border: 'none',
              borderTop:
                activeProvinceId === null
                  ? '2px solid #dc2626'
                  : '2px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeProvinceId === null ? 'bold' : 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            Tất cả khu vực
          </button>
          {provinces.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProvinceId(p.id);
                setFilterTheater('');
                setFilterRoom('');
              }}
              style={{
                padding: '10px 16px',
                background:
                  activeProvinceId === p.id ? '#2a2a2a' : 'transparent',
                color: activeProvinceId === p.id ? '#dc2626' : '#9ca3af',
                border: 'none',
                borderTop:
                  activeProvinceId === p.id
                    ? '2px solid #dc2626'
                    : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeProvinceId === p.id ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Grid Danh Sách Rạp */}
        <div className="bg-[#2a2a2a] p-5 rounded-lg border border-[#333] mt-2 mb-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#9D9D9D] font-medium">
              Danh Sách Rạp{' '}
              {activeProvinceId ? 'khu vực đang chọn' : 'tất cả khu vực'}:
            </h3>
            <button
              onClick={() => {
                setFilterTheater('');
                setFilterRoom('');
              }}
              className="text-[#dc2626] text-[13px] hover:underline font-medium"
            >
              Bỏ chọn rạp (Tất cả rạp)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredTheaters.length === 0 ? (
              <div className="col-span-full text-gray-500 text-sm italic py-4">
                Chưa có rạp nào ở khu vực này.
              </div>
            ) : (
              filteredTheaters.map((cinema) => (
                <div
                  key={cinema.id}
                  onClick={() => {
                    setFilterTheater(cinema.id);
                    setFilterRoom('');
                  }}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    filterTheater === cinema.id || filterTheater == cinema.id
                      ? 'bg-[#dc2626]/10 border-[#dc2626]/50'
                      : 'bg-[#18181b] border-[#333] hover:border-[#555]'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      checked={
                        filterTheater === cinema.id ||
                        filterTheater == cinema.id
                      }
                      onChange={() => {
                        setFilterTheater(cinema.id);
                        setFilterRoom('');
                      }}
                      className="w-4 h-4 accent-[#dc2626] cursor-pointer"
                      name="theaterSelection"
                    />
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-bold text-[14px] ${filterTheater === cinema.id || filterTheater == cinema.id ? 'text-white' : 'text-[#9D9D9D]'}`}
                    >
                      {cinema.name}
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-1 mt-1">
                      {cinema.address}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <select
            value={filterMovie}
            onChange={(e) => setFilterMovie(e.target.value)}
            style={{
              background: '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              padding: '8px 12px',
              outline: 'none',
              flex: 1,
              minWidth: '150px',
            }}
          >
            <option value="">Tất cả phim</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            style={{
              background: '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              padding: '8px 12px',
              outline: 'none',
              flex: 1,
              minWidth: '150px',
            }}
          >
            <option value="">Tất cả thể loại</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#2a2a2a',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span
              style={{
                paddingLeft: '10px',
                fontSize: '13px',
                color: '#9ca3af',
              }}
            >
              Từ ngày:
            </span>
            <input
              type="date"
              value={filterStartDate}
              max={filterEndDate}
              onChange={(e) => {
                if (filterEndDate && e.target.value > filterEndDate) {
                  addToast({
                    message: 'Từ ngày không được lớn hơn Đến ngày.',
                    type: 'error',
                  });
                } else {
                  setFilterStartDate(e.target.value);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px 8px',
                outline: 'none',
              }}
            />
            <div
              style={{
                width: '1px',
                height: '16px',
                background: 'rgba(255,255,255,0.2)',
              }}
            ></div>
            <span
              style={{ paddingLeft: '8px', fontSize: '13px', color: '#9ca3af' }}
            >
              Đến:
            </span>
            <input
              type="date"
              value={filterEndDate}
              min={filterStartDate}
              onChange={(e) => {
                if (filterStartDate && e.target.value < filterStartDate) {
                  addToast({
                    message: 'Đến ngày không được nhỏ hơn Từ ngày.',
                    type: 'error',
                  });
                } else {
                  setFilterEndDate(e.target.value);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px 8px',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#2a2a2a',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span
              style={{
                paddingLeft: '10px',
                fontSize: '13px',
                color: '#9ca3af',
              }}
            >
              Từ giờ:
            </span>
            <input
              type="time"
              value={filterStartTime}
              max={filterEndTime}
              onChange={(e) => {
                if (filterEndTime && e.target.value > filterEndTime) {
                  addToast({
                    message: 'Từ giờ không được lớn hơn Đến giờ.',
                    type: 'error',
                  });
                } else {
                  setFilterStartTime(e.target.value);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px 8px',
                outline: 'none',
              }}
            />
            <div
              style={{
                width: '1px',
                height: '16px',
                background: 'rgba(255,255,255,0.2)',
              }}
            ></div>
            <span
              style={{ paddingLeft: '8px', fontSize: '13px', color: '#9ca3af' }}
            >
              Đến:
            </span>
            <input
              type="time"
              value={filterEndTime}
              min={filterStartTime}
              onChange={(e) => {
                if (filterStartTime && e.target.value < filterStartTime) {
                  addToast({
                    message: 'Đến giờ không được nhỏ hơn Từ giờ.',
                    type: 'error',
                  });
                } else {
                  setFilterEndTime(e.target.value);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px 8px',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            style={{
              background: '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              padding: '8px 12px',
              outline: 'none',
              flex: 1,
              minWidth: '150px',
            }}
          >
            <option value="">Tất cả định dạng</option>
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            disabled={!filterTheater}
            style={{
              background: !filterTheater ? '#1a1a1a' : '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: !filterTheater ? '#666' : '#fff',
              padding: '8px 12px',
              outline: 'none',
              flex: 1,
              minWidth: '150px',
              cursor: !filterTheater ? 'not-allowed' : 'pointer',
              opacity: !filterTheater ? 0.6 : 1,
            }}
          >
            <option value="">
              {!filterTheater
                ? 'Vui lòng chọn rạp trước'
                : 'Tất cả phòng chiếu'}
            </option>
            {filterableRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || `Phòng ID: ${r.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#141414',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              {[
                'Phim',
                'Rạp',
                'Phòng',
                'Ngày chiếu',
                'Khung giờ',
                'Định dạng',
                'Thao tác',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#fff',
                  }}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : showtimes.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  Không có suất chiếu nào
                </td>
              </tr>
            ) : (
              paginatedShowtimes.map((st) => (
                <tr
                  key={st.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                >
                  <td
                    style={{
                      padding: '14px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#fff',
                    }}
                  >
                    {st.movieTitle || `Phim ID: ${st.movieId}`}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {theaters.find((t) => t.id == st.theaterId)?.name || 'Rạp'}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {st.roomName || `Phòng ID: ${st.roomId}`}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {st.showDate || '-'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#dc2626',
                        fontWeight: 'bold',
                      }}
                    >
                      {st.startTime} - {st.endTime}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <select
                      value={st.format || '2D Phụ đề'}
                      onChange={(e) =>
                        handleFormatChange(st.id, e.target.value)
                      }
                      style={{
                        background: '#222',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        padding: '6px 10px',
                        outline: 'none',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {FORMAT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {isPastShowtime(st.showDate, st.startTime) ? (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          fontStyle: 'italic',
                        }}
                      >
                        Đã kết thúc (Không thể thao tác)
                      </span>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        <button
                          onClick={() => handleEditClick(st)}
                          className="action-btn edit"
                          title="Sửa suất chiếu"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => toggleShowtimeVisibility(st.id)}
                          title={
                            st.isHidden
                              ? 'Trạng thái: Đang ẩn (Nhấn để hiện)'
                              : 'Trạng thái: Đang hiện (Nhấn để ẩn/xóa mềm)'
                          }
                          className={`action-btn ${st.isHidden ? 'hide' : 'edit'}`}
                        >
                          {st.isHidden ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {!loading && totalElements > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            totalElements={totalElements}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>
    </div>
  );
}
