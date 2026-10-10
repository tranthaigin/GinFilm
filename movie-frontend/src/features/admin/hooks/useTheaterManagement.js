import { useState, useEffect, useCallback, useRef } from 'react';
import { theaterApi } from '../api/theaterApi';
import { useToastStore } from './useToastStore';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook quản lý toàn bộ state cho trang Theater Management.
 * Flow: Province → Theater → Room
 */
export function useTheaterManagement() {
  const { addToast } = useToastStore();
  const location = useLocation();

  // ─── Data state ───────────────────────────────────────────────────────────
  const [provinces, setProvinces] = useState([]);
  const [rooms, setRooms] = useState([]);

  // ─── Selection state ──────────────────────────────────────────────────────
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedTheater, setSelectedTheater] = useState(null);

  // ─── Loading / error state ────────────────────────────────────────────────
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState(null);

  // ─── Modal state ──────────────────────────────────────────────────────────
  const [theaterModalOpen, setTheaterModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingTheater, setEditingTheater] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  // ─── Search state ─────────────────────────────────────────────────────────
  const [provinceSearch, setProvinceSearch] = useState('');
  const [theaterSearch, setTheaterSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');

  // ─── Fetch all provinces with theaters ───────────────────────────────────
  const fetchProvinces = useCallback(async () => {
    try {
      setLoadingProvinces(true);
      setError(null);
      const data = await theaterApi.getProvincesWithTheaters();
      setProvinces(data || []);
    } catch (err) {
      console.error('Error fetching provinces:', err);
      setError(err.message || 'Không thể tải danh sách cụm rạp');
      addToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách cụm rạp' });
    } finally {
      setLoadingProvinces(false);
    }
  }, [addToast]);

  // ─── Fetch rooms when a theater is selected ───────────────────────────────
  const fetchRooms = useCallback(async (theaterId) => {
    try {
      setLoadingRooms(true);
      const data = await theaterApi.getRoomsByTheater(theaterId);
      setRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      addToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách phòng chiếu' });
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [addToast]);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  const navigate = useNavigate();
  const hasRestoredRef = useRef(false);

  // ─── Restore state from location ──────────────────────────────────────────
  useEffect(() => {
    if (provinces.length > 0 && location.state?.theaterId && !hasRestoredRef.current) {
      const tId = location.state.theaterId;
      let foundProvince = null;
      let foundTheater = null;
      for (const p of provinces) {
        const t = (p.theaters || []).find(x => Number(x.id) === Number(tId));
        if (t) {
          foundProvince = p;
          foundTheater = t;
          break;
        }
      }
      if (foundProvince && foundTheater) {
        setSelectedProvince(foundProvince);
        setSelectedTheater(foundTheater);
        hasRestoredRef.current = true;
        // Clear state using React Router to avoid issues
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [provinces, location.state, navigate, location.pathname]);

  // ─── When theater is selected, load its rooms ────────────────────────────
  useEffect(() => {
    if (selectedTheater) {
      fetchRooms(selectedTheater.id);
    } else {
      setRooms([]);
    }
  }, [selectedTheater, fetchRooms]);

  // ─── Derived: filtered lists ──────────────────────────────────────────────
  const filteredProvinces = provinces.filter((p) =>
    p.name.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  // Theaters shown = theaters of selected province, or all theaters (flat) if none selected
  const theatersToShow = selectedProvince
    ? (selectedProvince.theaters || [])
    : provinces.flatMap((p) => (p.theaters || []).map((t) => ({ ...t, provinceName: p.name })));

  const filteredTheaters = theatersToShow.filter((t) =>
    t.name.toLowerCase().includes(theaterSearch.toLowerCase())
  );

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(roomSearch.toLowerCase())
  ).sort((a, b) => {
    const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  });

  // ─── Selection handlers ───────────────────────────────────────────────────
  const handleSelectProvince = (province) => {
    if (selectedProvince?.id === province.id) {
      // Deselect
      setSelectedProvince(null);
    } else {
      setSelectedProvince(province);
    }
    setSelectedTheater(null);
    setRooms([]);
    setTheaterSearch('');
  };

  const handleSelectTheater = (theater) => {
    if (selectedTheater?.id === theater.id) {
      // Deselect
      setSelectedTheater(null);
    } else {
      setSelectedTheater(theater);
    }
    setRoomSearch('');
  };

  // ─── Theater CRUD ─────────────────────────────────────────────────────────
  const openAddTheater = () => {
    if (theaterModalOpen || isSavingTheaterRef.current) return;
    setEditingTheater(null);
    setTheaterModalOpen(true);
  };

  const openEditTheater = (theater) => {
    if (theaterModalOpen || isSavingTheaterRef.current) return;
    setEditingTheater(theater);
    setTheaterModalOpen(true);
  };

  const closeTheaterModal = () => {
    setTheaterModalOpen(false);
    setEditingTheater(null);
  };

  const isSavingTheaterRef = useRef(false);
  const isSavingRoomRef = useRef(false);

  const saveTheater = async (formData) => {
    if (isSavingTheaterRef.current) return { success: false, message: 'Đang xử lý...' };
    isSavingTheaterRef.current = true;
    try {
      if (editingTheater) {
        await theaterApi.updateTheater(editingTheater.id, formData);
        addToast({ type: 'success', message: 'Cập nhật rạp thành công!' });
      } else {
        await theaterApi.createTheater(formData);
        addToast({ type: 'success', message: 'Thêm rạp mới thành công!' });
      }
      closeTheaterModal();
      await fetchProvinces();
      return { success: true };
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi lưu thông tin rạp' });
      return { success: false, message: err.message };
    } finally {
      isSavingTheaterRef.current = false;
    }
  };

  // ─── Room CRUD ────────────────────────────────────────────────────────────
  const openAddRoom = () => {
    if (roomModalOpen || isSavingRoomRef.current) return;
    setEditingRoom(null);
    setRoomModalOpen(true);
  };

  const openEditRoom = (room) => {
    if (roomModalOpen || isSavingRoomRef.current) return;
    setEditingRoom(room);
    setRoomModalOpen(true);
  };

  const closeRoomModal = () => {
    setRoomModalOpen(false);
    setEditingRoom(null);
  };

  const saveRoom = async (formData) => {
    if (isSavingRoomRef.current) return { success: false, message: 'Đang xử lý...' };
    isSavingRoomRef.current = true;
    try {
      if (editingRoom) {
        await theaterApi.updateRoom(editingRoom.id, formData);
        addToast({ type: 'success', message: 'Cập nhật phòng chiếu thành công!' });
      } else {
        await theaterApi.createRoom(selectedTheater.id, formData);
        addToast({ type: 'success', message: 'Thêm phòng chiếu thành công!' });
      }
      closeRoomModal();
      await fetchRooms(selectedTheater.id);
      return { success: true };
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi lưu phòng chiếu' });
      return { success: false, message: err.message };
    } finally {
      isSavingRoomRef.current = false;
    }
  };

  const toggleRoom = async (room) => {
    try {
      await theaterApi.toggleRoomStatus(room.id);
      addToast({ type: 'success', message: `Phòng chiếu đã được ${room.isActive === false ? 'hiện' : 'ẩn'}!` });
      await fetchRooms(selectedTheater.id);
      return { success: true };
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi cập nhật trạng thái phòng chiếu' });
      return { success: false, message: err.message };
    }
  };

  return {
    // Data
    provinces,
    filteredProvinces,
    filteredTheaters,
    filteredRooms,

    // Selection
    selectedProvince,
    selectedTheater,

    // Loading
    loadingProvinces,
    loadingRooms,
    error,

    // Search
    provinceSearch, setProvinceSearch,
    theaterSearch, setTheaterSearch,
    roomSearch, setRoomSearch,

    // Handlers
    handleSelectProvince,
    handleSelectTheater,

    // Theater modal
    theaterModalOpen,
    editingTheater,
    openAddTheater,
    openEditTheater,
    closeTheaterModal,
    saveTheater,

    // Room modal
    roomModalOpen,
    editingRoom,
    openAddRoom,
    openEditRoom,
    closeRoomModal,
    saveRoom,
    toggleRoom,

    // Refresh
    fetchProvinces,
  };
}
