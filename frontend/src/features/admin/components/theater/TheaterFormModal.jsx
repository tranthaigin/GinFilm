import { useState } from 'react';
import { X, Building, MapPin, Phone, Globe } from 'lucide-react';

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '13px',
  color: '#fff',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  fontFamily: '"Inter", sans-serif',
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export default function TheaterFormModal({
  isOpen,
  onClose,
  onSave,
  editingTheater,
  provinces = [],
}) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    provinceId: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const resetKey1 = JSON.stringify([isOpen, editingTheater]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    if (isOpen) {
      if (editingTheater) {
        setForm({
          name: editingTheater.name || '',
          address: editingTheater.address || '',
          phone: editingTheater.phone || '',
          provinceId: editingTheater.provinceId
            ? String(editingTheater.provinceId)
            : '',
        });
      } else {
        setForm({ name: '', address: '', phone: '', provinceId: '' });
      }
      setErrors({});
    }
  }

  const validate = () => {
    const errs = {};
    const nameVal = form.name.trim();
    const addressVal = form.address.trim();
    const phoneVal = form.phone.trim();

    // Validate Tên rạp
    if (!nameVal) {
      errs.name = 'Tên rạp không được trống';
    } else if (nameVal.length < 3) {
      errs.name = 'Tên rạp phải có ít nhất 3 ký tự';
    } else if (nameVal.length > 100) {
      errs.name = 'Tên rạp tối đa 100 ký tự';
    }

    // Validate Tỉnh/Thành
    if (!form.provinceId) {
      errs.provinceId = 'Vui lòng chọn tỉnh/thành';
    }

    // Validate Địa chỉ
    if (!addressVal) {
      errs.address = 'Địa chỉ không được trống';
    } else if (addressVal.length < 5) {
      errs.address = 'Địa chỉ phải có ít nhất 5 ký tự';
    } else if (addressVal.length > 200) {
      errs.address = 'Địa chỉ tối đa 200 ký tự';
    }

    // Validate Số điện thoại
    if (!phoneVal) {
      errs.phone = 'Số điện thoại không được trống';
    } else if (!phoneVal.startsWith('0')) {
      errs.phone = 'Số điện thoại phải bắt đầu bằng chữ số 0';
    } else if (phoneVal.length < 10 || phoneVal.length > 11) {
      errs.phone = 'Số điện thoại phải từ 10 đến 11 chữ số';
    } else if (!/^0(2\d{9}|[35789]\d{8})$/.test(phoneVal)) {
      errs.phone =
        'Số điện thoại không hợp lệ (10 số di động hoặc 11 số cố định)';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const result = await onSave({
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        provinceId: Number(form.provinceId),
      });
      if (result?.success) onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    let val = value;
    if (field === 'name') {
      val = val.replace(/[!@#$%^&*()_+={}[\]|\\<>/?~`]/g, '');
    }
    if (field === 'phone') {
      val = val.replace(/[^0-9]/g, '').substring(0, 11);
    }
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#161616',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '28px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #dc2626, #ff4b72)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building size={20} color="#fff" />
            </div>
            <div>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {editingTheater ? 'Chỉnh sửa rạp' : 'Thêm rạp mới'}
              </h3>
              <p
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '12px',
                  margin: '2px 0 0 0',
                }}
              >
                {editingTheater
                  ? `ID: ${editingTheater.id}`
                  : 'Điền thông tin rạp chiếu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Tên rạp */}
          <div>
            <label style={labelStyle}>
              <Building
                size={11}
                style={{ marginRight: 4, display: 'inline' }}
              />
              Tên rạp *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="VD: CGV Vincom Center"
              style={{
                ...inputStyle,
                borderColor: errors.name ? '#dc2626' : 'rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#dc2626';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.name
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)';
              }}
            />
            {errors.name && (
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '11px',
                  margin: '4px 0 0 0',
                }}
              >
                {errors.name}
              </p>
            )}
          </div>

          {/* Tỉnh/thành */}
          <div>
            <label style={labelStyle}>
              <Globe size={11} style={{ marginRight: 4, display: 'inline' }} />
              Tỉnh / Thành phố *
            </label>
            <select
              value={form.provinceId}
              onChange={(e) => handleChange('provinceId', e.target.value)}
              style={{
                ...inputStyle,
                borderColor: errors.provinceId
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#dc2626';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.provinceId
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)';
              }}
            >
              <option value="" style={{ background: '#1a1a1a' }}>
                — Chọn tỉnh/thành —
              </option>
              {provinces.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  style={{ background: '#1a1a1a' }}
                >
                  {p.name}
                </option>
              ))}
            </select>
            {errors.provinceId && (
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '11px',
                  margin: '4px 0 0 0',
                }}
              >
                {errors.provinceId}
              </p>
            )}
          </div>

          {/* Địa chỉ */}
          <div>
            <label style={labelStyle}>
              <MapPin size={11} style={{ marginRight: 4, display: 'inline' }} />
              Địa chỉ *
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="VD: 72 Lê Thánh Tôn, Quận 1, TP.HCM"
              style={{
                ...inputStyle,
                borderColor: errors.address
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#dc2626';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.address
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)';
              }}
            />
            {errors.address && (
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '11px',
                  margin: '4px 0 0 0',
                }}
              >
                {errors.address}
              </p>
            )}
          </div>

          {/* Số điện thoại */}
          <div>
            <label style={labelStyle}>
              <Phone size={11} style={{ marginRight: 4, display: 'inline' }} />
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="VD: 02838221234"
              style={{
                ...inputStyle,
                borderColor: errors.phone ? '#dc2626' : 'rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#dc2626';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.phone
                  ? '#dc2626'
                  : 'rgba(255,255,255,0.1)';
              }}
            />
            {errors.phone && (
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '11px',
                  margin: '4px 0 0 0',
                }}
              >
                {errors.phone}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                padding: '11px',
                borderRadius: '10px',
                border: 'none',
                background: saving
                  ? 'rgba(220,38,38,0.5)'
                  : 'linear-gradient(135deg, #dc2626 0%, #ff4b72 100%)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: '"Inter", sans-serif',
                transition: 'opacity 0.2s',
              }}
            >
              {saving
                ? 'Đang lưu...'
                : editingTheater
                  ? 'Cập nhật'
                  : '+ Thêm rạp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
