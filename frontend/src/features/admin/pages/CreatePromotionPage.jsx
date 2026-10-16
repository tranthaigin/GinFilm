import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';

const parseDiscount = (discountStr) => {
  if (discountStr === null || discountStr === undefined) return '';
  if (typeof discountStr === 'number') return discountStr.toString();
  const digits = discountStr.replace(/\D/g, '');
  const num = parseInt(digits, 10);
  if (!isNaN(num) && num >= 0) {
    return num.toString();
  }
  return '';
};

const toDateTimeLocal = (val) => {
  if (!val) return '';
  if (val.includes('T')) return val.slice(0, 16);
  return `${val}T00:00`;
};

export default function CreatePromotionPage({ onBack, initialData, onSave }) {
  useLocation().pathname.startsWith('/staff');

  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    code: initialData?.code || '',
    discount: parseDiscount(initialData?.discount),
    description: initialData?.description || '',
    scope: initialData?.scope || 'ALL',
    discountType: initialData?.discountType || 'PERCENTAGE',
    maxDiscount: initialData?.maxDiscount || '',
    minOrderValue: initialData?.minOrderValue || '',
    usageLimitPerUser: initialData?.usageLimitPerUser || '',
  });

  const [startDate, setStartDate] = useState(
    initialData?.startDate ? toDateTimeLocal(initialData.startDate) : ''
  );
  const [endDate, setEndDate] = useState(
    initialData?.end ? toDateTimeLocal(initialData.end) : ''
  );

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    initialData?.imageUrl || null
  );
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const resetKey101 = JSON.stringify([initialData]);
  const [previousResetKey101, setPreviousResetKey101] = useState(null);
  if (previousResetKey101 !== resetKey101) {
    setPreviousResetKey101(resetKey101);
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        code: initialData.code || '',
        discount: parseDiscount(initialData.discount),
        description: initialData.description || '',
        scope: initialData.scope || 'ALL',
        discountType: initialData.discountType || 'PERCENTAGE',
        maxDiscount: initialData.maxDiscount || '',
        minOrderValue: initialData.minOrderValue || '',
        usageLimitPerUser: initialData.usageLimitPerUser || '',
      });
      setStartDate(
        initialData.startDate ? toDateTimeLocal(initialData.startDate) : ''
      );
      setEndDate(initialData.end ? toDateTimeLocal(initialData.end) : '');
      setImagePreview(initialData.imageUrl || null);
      setImageFile(null);
      setErrors({});
    } else {
      setFormData({
        title: '',
        code: '',
        discount: '',
        description: '',
        scope: 'ALL',
        discountType: 'PERCENTAGE',
        maxDiscount: '',
        usageLimitPerUser: '',
      });
      setStartDate('');
      setEndDate('');
      setImagePreview(null);
      setImageFile(null);
      setErrors({});
    }
  }

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          addToast({
            message: 'Chỉ được chọn file định dạng ảnh (JPEG, PNG, WEBP, GIF)',
            type: 'error',
          });
          e.target.value = '';
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          addToast({
            message: 'Kích thước ảnh không được vượt quá 10MB',
            type: 'error',
          });
          e.target.value = '';
          return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        if (errors.image) setErrors((prev) => ({ ...prev, image: false }));
      }
    } else if (name === 'discount') {
      const cleanVal = value.replace(/\D/g, '');
      if (cleanVal === '') {
        setFormData({ ...formData, discount: '' });
        if (errors.discount)
          setErrors((prev) => ({ ...prev, discount: false }));
        return;
      }
      let num = parseInt(cleanVal, 10);
      if (formData.discountType === 'PERCENTAGE' && num > 100) {
        num = 100;
        addToast({
          message: 'Mức giảm theo phần trăm tối đa là 100%',
          type: 'error',
        });
      }
      if (num >= 0) {
        setFormData({ ...formData, discount: num.toString() });
        if (errors.discount)
          setErrors((prev) => ({ ...prev, discount: false }));
      }
    } else if (name === 'discountType') {
      const newType = value;
      let newDiscount = formData.discount;
      if (newType === 'PERCENTAGE' && Number(newDiscount) > 100) {
        newDiscount = '100';
        addToast({
          message: 'Mức giảm theo phần trăm tối đa là 100%',
          type: 'error',
        });
      }
      setFormData({
        ...formData,
        discountType: newType,
        discount: newDiscount,
      });
    } else if (name === 'maxDiscount') {
      const cleanVal = value.replace(/\D/g, '');
      if (cleanVal !== '' && Number(cleanVal) > 50000000) {
        addToast({
          message: 'Giảm tối đa không được vượt quá 50.000.000 VNĐ',
          type: 'error',
        });
        setFormData({ ...formData, maxDiscount: '50000000' });
        return;
      }
      setFormData({ ...formData, maxDiscount: cleanVal });
    } else if (name === 'minOrderValue') {
      const cleanVal = value.replace(/\D/g, '');
      if (cleanVal !== '' && Number(cleanVal) > 100000000) {
        addToast({
          message: 'Điều kiện tối thiểu không được vượt quá 100.000.000 VNĐ',
          type: 'error',
        });
        setFormData({ ...formData, minOrderValue: '100000000' });
        return;
      }
      setFormData({ ...formData, minOrderValue: cleanVal });
    } else if (name === 'usageLimitPerUser') {
      const cleanVal = value.replace(/\D/g, '');
      setFormData({ ...formData, usageLimitPerUser: cleanVal });
    } else if (name === 'description') {
      const val = value.replace(/^\s+/, '');
      setFormData({ ...formData, description: val });
      if (errors.description)
        setErrors((prev) => ({ ...prev, description: false }));
    } else {
      let newValue = value;
      if (name === 'title') {
        newValue = newValue.replace(/[!@#$^&*()_+={}[\]|\\<>/?~`]/g, '');
      }
      setFormData({ ...formData, [name]: newValue });
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const today = new Date();
  const todayDateTimeStr = today.toISOString().slice(0, 16);

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: false }));
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: false }));
  };

  const getMinSpendLabel = () => {
    if (formData.scope === 'TICKET_ONLY')
      return 'Tiền VÉ tối thiểu (Tùy chọn - VNĐ)';
    if (formData.scope === 'COMBO_ONLY')
      return 'Tiền Bắp nước tối thiểu (Tùy chọn - VNĐ)';
    return 'Tổng đơn (Vé+Bắp) tối thiểu (Tùy chọn - VNĐ)';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.title || formData.title.trim() === '')
      newErrors.title = 'Vui lòng nhập tên ưu đãi';
    if (!formData.discount || formData.discount.trim() === '')
      newErrors.discount = 'Vui lòng nhập mức giảm';

    if (!formData.description || formData.description.trim() === '')
      newErrors.description = 'Vui lòng nhập chi tiết';
    else if (formData.description !== formData.description.trim())
      newErrors.description =
        'Nội dung chi tiết không được có khoảng trắng ở đầu hoặc cuối';
    if (!isEditMode && !imageFile)
      newErrors.image = 'Vui lòng tải lên ảnh banner';

    if (
      formData.discountType === 'PERCENTAGE' &&
      Number(formData.discount) > 100
    ) {
      newErrors.discount = 'Mức giảm theo phần trăm tối đa là 100%';
    }
    if (formData.maxDiscount && Number(formData.maxDiscount) > 50000000) {
      newErrors.maxDiscount = 'Giảm tối đa không được vượt quá 50.000.000 VNĐ';
    }
    if (formData.minOrderValue && Number(formData.minOrderValue) > 100000000) {
      newErrors.minOrderValue =
        'Điều kiện tối thiểu không được vượt quá 100.000.000 VNĐ';
    }

    if (startDate && endDate && startDate >= endDate) {
      newErrors.startDate = 'Ngày kết thúc phải lớn hơn ngày bắt đầu';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({ message: Object.values(newErrors)[0], type: 'error' });
      return;
    }

    setErrors({});
    setIsSaving(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('code', formData.code || '');
    data.append('discount', parseInt(formData.discount, 10));
    data.append('startDate', startDate);
    data.append('end', endDate);
    data.append('description', formData.description);
    data.append('scope', formData.scope);
    data.append('discountType', formData.discountType);
    if (formData.maxDiscount) {
      data.append('maxDiscount', parseFloat(formData.maxDiscount));
    }
    if (formData.minOrderValue) {
      data.append('minOrderValue', parseFloat(formData.minOrderValue));
    }
    if (formData.usageLimitPerUser) {
      data.append(
        'usageLimitPerUser',
        parseInt(formData.usageLimitPerUser, 10)
      );
    }
    if (imageFile) {
      data.append('image', imageFile);
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
  };

  const labelStyle = {
    display: 'block',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    marginBottom: '6px',
    fontWeight: 500,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
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
          <button
            onClick={onBack}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2
              style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              {isEditMode ? 'Chỉnh sửa ưu đãi' : 'Thêm ưu đãi mới'}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                margin: '2px 0 0 0',
              }}
            >
              {isEditMode
                ? 'Cập nhật thông tin khuyến mãi'
                : 'Nhập thông tin ưu đãi mới'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: isSaving
              ? '#6b7280'
              : 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: isSaving ? 'none' : '0 4px 12px rgba(220,38,38,0.3)',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <Save size={16} />
          {isSaving ? 'Đang lưu...' : 'Lưu ưu đãi'}
        </button>
      </div>

      <div
        style={{
          background: '#141414',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Tên ưu đãi *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="VD: Giảm 20% cho thành viên mới"
              style={{
                ...inputStyle,
                borderColor: errors.title ? '#dc2626' : 'rgba(255,255,255,0.1)',
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Mã Code (Tùy chọn)</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="VD: NEWBIE20"
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Phạm vi áp dụng</label>
            <select
              name="scope"
              value={formData.scope}
              onChange={handleChange}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="ALL">Tất cả (Vé & Bắp nước)</option>
              <option value="TICKET_ONLY">Chỉ áp dụng cho Vé</option>
              <option value="COMBO_ONLY">Chỉ áp dụng cho Bắp nước</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Loại giảm giá</label>
            <select
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="PERCENTAGE">Phần trăm (%)</option>
              <option value="FIXED_AMOUNT">Số tiền mặt (VNĐ)</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Mức giảm *</label>
            <input
              type="text"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
              placeholder={
                formData.discountType === 'PERCENTAGE' ? 'VD: 20' : 'VD: 50000'
              }
              style={{
                ...inputStyle,
                borderColor: errors.discount
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)',
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Giảm tối đa (Tùy chọn)</label>
            <input
              type="text"
              name="maxDiscount"
              value={formData.maxDiscount}
              onChange={handleChange}
              placeholder="VD: 100000"
              style={inputStyle}
              disabled={formData.discountType === 'FIXED_AMOUNT'}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>{getMinSpendLabel()}</label>
            <input
              type="text"
              name="minOrderValue"
              value={formData.minOrderValue}
              onChange={handleChange}
              placeholder="VD: 140000"
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Giới hạn mỗi tài khoản (Tùy chọn)</label>
            <input
              type="text"
              name="usageLimitPerUser"
              value={formData.usageLimitPerUser}
              onChange={handleChange}
              placeholder="VD: 1"
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelStyle}>Ảnh banner *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                onChange={handleChange}
                style={{
                  ...inputStyle,
                  padding: '7px 12px',
                  background: 'transparent',
                  borderColor: errors.image
                    ? '#dc2626'
                    : 'rgba(255,255,255,0.1)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', gridColumn: 'span 2' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Ngày bắt đầu (Tùy chọn)</label>
              <input
                type="datetime-local"
                value={startDate}
                min={todayDateTimeStr}
                max={endDate || ''}
                onChange={handleStartDateChange}
                style={{
                  ...inputStyle,
                  borderColor: errors.startDate
                    ? '#dc2626'
                    : 'rgba(255,255,255,0.1)',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Ngày kết thúc (Tùy chọn)</label>
              <input
                type="datetime-local"
                value={endDate}
                min={startDate || todayDateTimeStr}
                onChange={handleEndDateChange}
                style={{
                  ...inputStyle,
                  borderColor: errors.endDate
                    ? '#dc2626'
                    : 'rgba(255,255,255,0.1)',
                }}
              />
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Nội dung chi tiết *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              onBlur={() =>
                setFormData((prev) => ({
                  ...prev,
                  description: (prev.description || '').trim(),
                }))
              }
              placeholder="Nhập nội dung ưu đãi chi tiết, điều kiện & thể lệ..."
              rows={4}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '80px',
                borderColor: errors.description
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)',
              }}
            />
          </div>

          {imagePreview && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Xem trước banner</label>
              <div
                style={{
                  width: '320px',
                  height: '160px',
                  borderRadius: '8px',
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginTop: '4px',
                }}
              >
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div
                  style={{
                    display: 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <ImageIcon size={24} />
                  <span
                    style={{
                      fontSize: '11px',
                      textAlign: 'center',
                      padding: '0 8px',
                    }}
                  >
                    Không thể tải ảnh.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
