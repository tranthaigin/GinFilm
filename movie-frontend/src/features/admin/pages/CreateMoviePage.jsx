import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Image as ImageIcon, Film, X } from 'lucide-react';
import { useGenreManagement } from '../hooks/useGenreManagement';
import { useToastStore } from '../hooks/useToastStore';
import { movieFormatApi } from '../api/movieFormatApi';

export default function CreateMoviePage({ onBack, initialData, onSave }) {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const addToast = useToastStore((state) => state.addToast);
  const { genres: dbGenres } = useGenreManagement();
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    duration: initialData?.duration || '',
    releaseDateTime: initialData?.releaseDate && initialData?.startTime ? `${initialData.releaseDate}T${initialData.startTime.substring(0, 5)}` : '',
    endDateTime: initialData?.endDate && initialData?.endTime ? `${initialData.endDate}T${initialData.endTime.substring(0, 5)}` : '',
    posterUrl: initialData?.posterUrl || '',
    trailerUrl: initialData?.trailerUrl || '',
    ageRating: initialData?.ageRating || 'P',
    status: initialData?.status || '',
    genreIds: initialData?.genreIds || [],
    formatIds: initialData?.formatIds || [],
    isOnlineAvailable: initialData?.isOnlineAvailable || false,
    isCinemaAvailable: initialData?.isCinemaAvailable ?? true,
    videoUrl: initialData?.videoUrl || '',
    basePrice: '',
  });

  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(initialData?.posterUrl || null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        duration: initialData.duration || '',
        releaseDateTime: initialData.releaseDate && initialData.startTime ? `${initialData.releaseDate}T${initialData.startTime.substring(0, 5)}` : '',
        endDateTime: initialData.endDate && initialData.endTime ? `${initialData.endDate}T${initialData.endTime.substring(0, 5)}` : '',
        trailerUrl: initialData.trailerUrl || '',
        ageRating: initialData.ageRating || 'P',
        status: initialData.status || '',
        genreIds: initialData.genreIds || [],
        formatIds: initialData.formatIds || [],
        isOnlineAvailable: initialData.isOnlineAvailable || false,
        isCinemaAvailable: initialData.isCinemaAvailable ?? true,
        videoUrl: initialData.videoUrl || '',
        basePrice: '',
      });
      setPosterPreview(initialData.posterUrl || null);
      setPosterFile(null);
      setErrors({});
    }
  }, [initialData]);

  const [dbFormats, setDbFormats] = useState([]);
  useEffect(() => {
    const loadFormats = async () => {
      try {
        const data = await movieFormatApi.getAll();
        setDbFormats(data);
      } catch (err) {
        console.error('Failed to load formats', err);
      }
    };
    loadFormats();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (file) {
        setPosterFile(file);
        setPosterPreview(URL.createObjectURL(file));
        if (errors.poster) setErrors(prev => ({ ...prev, poster: false }));
      }
    } else {
      let val = type === 'checkbox' ? checked : value;
      
      if (name === 'duration' || name === 'basePrice') {
         val = val.toString().replace(/[^0-9]/g, '');
      }
      if (name === 'basePrice' && val !== '' && Number(val) > 50000000) {
         addToast({ message: 'Giá bán gốc tối đa là 50.000.000 VNĐ', type: 'error' });
         return;
      }
      if (name === 'title') {
         val = val.replace(/[!@#$%^&*()_+={}\[\]|\\<>\/?~`]/g, '');
      }

      if (name === 'movieTypeRadio') {
        const isOnline = val === 'online' || val === 'both';
        const isCinema = val === 'cinema' || val === 'both';
        setFormData({ ...formData, isOnlineAvailable: isOnline, isCinemaAvailable: isCinema });
      } else {
        setFormData({ ...formData, [name]: val });
      }
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleGenreToggle = (genreId) => {
    setFormData((prev) => {
      const currentGenres = prev.genreIds;
      let newGenres;
      if (currentGenres.includes(genreId)) {
        newGenres = currentGenres.filter((id) => id !== genreId);
      } else {
        newGenres = [...currentGenres, genreId];
      }
      if (errors.genreIds && newGenres.length > 0) {
        setErrors(errs => ({ ...errs, genreIds: false }));
      }
      return { ...prev, genreIds: newGenres };
    });
  };

  const handleFormatToggle = (formatId) => {
    setFormData((prev) => {
      const currentFormats = prev.formatIds;
      let newFormats;
      if (currentFormats.includes(formatId)) {
        newFormats = currentFormats.filter((id) => id !== formatId);
      } else {
        newFormats = [...currentFormats, formatId];
      }
      if (errors.formatIds && newFormats.length > 0) {
        setErrors(errs => ({ ...errs, formatIds: false }));
      }
      return { ...prev, formatIds: newFormats };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.title || formData.title.trim() === '') newErrors.title = 'Vui lòng nhập tên phim';
    if (!formData.duration || Number(formData.duration) <= 0) newErrors.duration = 'Thời lượng phải lớn hơn 0';
    if (!formData.status) newErrors.status = 'Vui lòng chọn trạng thái phim';
    if (!formData.releaseDateTime) newErrors.releaseDateTime = 'Vui lòng chọn thời gian khởi chiếu';
    if (!formData.endDateTime) newErrors.endDateTime = 'Vui lòng chọn thời gian kết thúc';
    if (!isEditMode && !posterFile) newErrors.poster = 'Vui lòng tải lên ảnh poster';
    if (formData.genreIds.length === 0) newErrors.genreIds = 'Vui lòng chọn ít nhất 1 thể loại';
    if (formData.isCinemaAvailable && formData.formatIds.length === 0) newErrors.formatIds = 'Vui lòng chọn ít nhất 1 định dạng';
    if (formData.isOnlineAvailable && (!formData.videoUrl || formData.videoUrl.trim() === '')) newErrors.videoUrl = 'Vui lòng nhập link video';
    if (!isEditMode && formData.isOnlineAvailable) {
       if (!formData.basePrice || Number(formData.basePrice) <= 0 || Number(formData.basePrice) > 50000000) {
          newErrors.basePrice = 'Giá bán gốc phải từ 1 đến 50.000.000 VNĐ';
       }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({ message: Object.values(newErrors)[0], type: 'error' });
      return;
    }

    setErrors({});
    setIsSaving(true);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'genreIds') {
        formData.genreIds.forEach(id => data.append('genreIds', id));
      } else if (key === 'formatIds') {
        formData.formatIds.forEach(id => data.append('formatIds', id));
      } else if (key === 'releaseDateTime') {
        if (formData.releaseDateTime) {
          const [date, time] = formData.releaseDateTime.split('T');
          data.append('releaseDate', date);
          data.append('startTime', time);
        }
      } else if (key === 'endDateTime') {
        if (formData.endDateTime) {
          const [date, time] = formData.endDateTime.split('T');
          data.append('endDate', date);
          data.append('endTime', time);
        }
      } else if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });
    if (posterFile) {
      data.append('poster', posterFile);
    }

    if (onSave) {
      const result = await onSave(data);
      if (result && !result.success) {
        addToast({ message: `Thất bại: ${result.message}`, type: 'error' });
      }
    }
    setIsSaving(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: '"Inter", sans-serif',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    marginBottom: '6px',
    fontWeight: 500,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: 0 }}>
              {isEditMode ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0 0' }}>
              {isEditMode ? 'Cập nhật thông tin chi tiết của bộ phim' : 'Nhập thông tin chi tiết cho bộ phim mới'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: isSaving ? '#6b7280' : 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: isSaving ? 'none' : '0 4px 12px rgba(220,38,38,0.3)',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <Save size={16} />
          {isSaving ? 'Đang lưu...' : 'Lưu bộ phim'}
        </button>
      </div>

      {/* ── Main card: 2-column grid ── */}
      <div
        style={{
          background: '#141414',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 200px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ── LEFT: Form fields ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

          {/* Row 1: title (2), ageRating (1), status (1) */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Tên phim *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="VD: Avengers: Doomsday"
              style={{ ...inputStyle, borderColor: errors.title ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
          </div>
          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Độ tuổi *</label>
            <select name="ageRating" value={formData.ageRating} onChange={handleChange} style={inputStyle}>
              <option value="P">P - Phổ biến</option>
              <option value="K">K - Dưới 13T (cùng cha mẹ)</option>
              <option value="T13">T13 - Trên 13T</option>
              <option value="T16">T16 - Trên 16T</option>
              <option value="T18">T18 - Trên 18T</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Trạng thái *</label>
            <select name="status" value={formData.status} onChange={handleChange} style={{ ...inputStyle, borderColor: errors.status ? '#dc2626' : 'rgba(255,255,255,0.1)' }}>
              <option value="" disabled>Chọn trạng thái</option>
              <option value="upcoming">Sắp chiếu</option>
              <option value="showing">Đang chiếu</option>
              {isEditMode && <option value="ended">Đã kết thúc</option>}
            </select>
          </div>

          {/* Row 2: duration (1), checkbox (3) */}
          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Thời lượng (phút) *</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              placeholder="120"
              style={{ ...inputStyle, borderColor: errors.duration ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
          </div>
          <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <label style={labelStyle}>Loại hình chiếu *</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="movieTypeRadio"
                  value="cinema"
                  checked={formData.isCinemaAvailable && !formData.isOnlineAvailable}
                  onChange={handleChange}
                  style={{ accentColor: '#dc2626', cursor: 'pointer' }}
                />
                Chỉ chiếu rạp
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="movieTypeRadio"
                  value="online"
                  checked={!formData.isCinemaAvailable && formData.isOnlineAvailable}
                  onChange={handleChange}
                  style={{ accentColor: '#dc2626', cursor: 'pointer' }}
                />
                Chỉ chiếu Online
              </label>
            </div>
          </div>

          {/* Row 3: Dates & Times */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Thời gian khởi chiếu *</label>
            <input
              type="datetime-local"
              name="releaseDateTime"
              value={formData.releaseDateTime}
              onChange={handleChange}
              disabled={!formData.status || (isEditMode && initialData?.status === 'showing')}
              min={new Date().toISOString().slice(0, 16)}
              style={{ ...inputStyle, borderColor: errors.releaseDateTime ? '#dc2626' : 'rgba(255,255,255,0.1)', opacity: (!formData.status || (isEditMode && initialData?.status === 'showing')) ? 0.5 : 1, cursor: (!formData.status || (isEditMode && initialData?.status === 'showing')) ? 'not-allowed' : 'auto' }}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Thời gian kết thúc *</label>
            <input
              type="datetime-local"
              name="endDateTime"
              value={formData.endDateTime}
              onChange={handleChange}
              disabled={!formData.status || (isEditMode && initialData?.status === 'showing' && initialData?.hasShowtimes)}
              min={formData.releaseDateTime || new Date().toISOString().slice(0, 16)}
              style={{ ...inputStyle, borderColor: errors.endDateTime ? '#dc2626' : 'rgba(255,255,255,0.1)', opacity: (!formData.status || (isEditMode && initialData?.status === 'showing' && initialData?.hasShowtimes)) ? 0.5 : 1, cursor: (!formData.status || (isEditMode && initialData?.status === 'showing' && initialData?.hasShowtimes)) ? 'not-allowed' : 'auto' }}
            />
          </div>

          {/* Row 3: video URL (conditional) */}
          {formData.isOnlineAvailable && (
            <div style={{ gridColumn: 'span 4', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Đường dẫn Video (URL) *</label>
                <div style={{ position: 'relative' }}>
                  <Film size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    name="videoUrl"
                    value={formData.videoUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/video.mp4"
                    style={{ ...inputStyle, paddingLeft: '36px', borderColor: errors.videoUrl ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Giá vé trực tuyến gốc (VNĐ) *</label>
                {isEditMode ? (
                  <div style={{ padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', color: '#60a5fa', fontSize: '13px', display: 'flex', alignItems: 'center', height: '100%', boxSizing: 'border-box' }}>
                    Vui lòng vào Quản lí Giá Vé {'>'} Phim trực tuyến để đổi giá và cài đặt khuyến mãi.
                  </div>
                ) : (
                  <input
                    type="text"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleChange}
                    placeholder="Ví dụ: 50000"
                    style={{ ...inputStyle, borderColor: errors.basePrice ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Row 4: Description — full width, taller */}
          <div style={{ gridColumn: 'span 4' }}>
            <label style={labelStyle}>Mô tả phim</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Nhập nội dung tóm tắt của bộ phim..."
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '110px' }}
            />
          </div>

          {/* Row 5: Poster file + Trailer URL */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Ảnh Poster *</label>
            <input
              type="file"
              name="poster"
              accept="image/*"
              onChange={handleChange}
              style={{ ...inputStyle, padding: '7px 12px', background: 'transparent', borderColor: errors.poster ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Link Trailer (URL)</label>
            <div style={{ position: 'relative' }}>
              <Film size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                name="trailerUrl"
                value={formData.trailerUrl}
                onChange={handleChange}
                placeholder="https://example.com/trailer.mp4"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Row 6: Genres */}
          <div style={{ gridColumn: 'span 4' }}>
            <label style={{ ...labelStyle, color: errors.genreIds ? '#dc2626' : 'rgba(255,255,255,0.7)' }}>
              Thể loại (Genres) *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px', border: errors.genreIds ? '1px dashed #dc2626' : 'none', borderRadius: '8px' }}>
              {dbGenres.map((genre) => {
                const isSelected = formData.genreIds.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => handleGenreToggle(genre.id)}
                    type="button"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: isSelected ? 'rgba(220,38,38,0.1)' : 'transparent',
                      border: `1px solid ${isSelected ? '#dc2626' : 'rgba(255,255,255,0.2)'}`,
                      color: isSelected ? '#dc2626' : 'rgba(255,255,255,0.6)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 7: Formats (Only for Cinema movies) */}
          {formData.isCinemaAvailable && (
            <div style={{ gridColumn: 'span 4' }}>
              <label style={{ ...labelStyle, color: errors.formatIds ? '#dc2626' : 'rgba(255,255,255,0.7)' }}>
                Định dạng phim (Formats) *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px', border: errors.formatIds ? '1px dashed #dc2626' : 'none', borderRadius: '8px' }}>
                {dbFormats.map((format) => {
                  const isSelected = formData.formatIds.includes(format.id);
                  return (
                    <button
                      key={format.id}
                      onClick={() => handleFormatToggle(format.id)}
                      type="button"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '16px',
                        background: isSelected ? 'rgba(139,92,246,0.1)' : 'transparent',
                        border: `1px solid ${isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.2)'}`,
                        color: isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.6)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {format.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Poster preview panel (sticky) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={labelStyle}>Xem trước Poster</label>
          <div
            style={{
              width: '200px',
              height: '300px',
              borderRadius: '10px',
              background: '#1a1a1a',
              border: `1px solid ${posterPreview ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'sticky',
              top: '16px',
              transition: 'border-color 0.3s',
            }}
          >
            {posterPreview ? (
              <>
                <img
                  src={posterPreview}
                  alt="Poster Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', padding: '16px', textAlign: 'center' }}>
                  <ImageIcon size={28} />
                  <span style={{ fontSize: '11px' }}>Không thể tải ảnh</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.2)', padding: '16px', textAlign: 'center' }}>
                <ImageIcon size={36} />
                <span style={{ fontSize: '11px', lineHeight: 1.6 }}>
                  Chọn ảnh poster<br />để xem trước
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
