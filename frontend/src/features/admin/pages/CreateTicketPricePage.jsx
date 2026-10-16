import { useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import { ArrowLeft, Save, Calendar } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';

// Mapping enum DB → nhãn hiển thị UI
const AUDIENCE_OPTIONS = [
  { value: 'ADULT', label: 'Người lớn' },
  { value: 'STUDENT', label: 'Học sinh / Sinh viên' },
  { value: 'CHILD', label: 'Trẻ em' },
  { value: 'SENIOR', label: 'Người cao tuổi' },
];

const SEAT_OPTIONS = [
  { value: 'NORMAL', label: 'Thường' },
  { value: 'VIP', label: 'VIP' },
  { value: 'SWEETBOX', label: 'Ghế đôi' },
  { value: 'BED', label: 'Giường nằm' },
];

const ROOM_OPTIONS = [
  { value: 'LO_RAP', label: 'Rạp tiêu chuẩn (LoRap)' },
  { value: 'LO_BED', label: 'Rạp giường nằm (LoBed)' },
  { value: 'LO_SCREEN_X', label: 'Rạp ScreenX (LoScreenX)' },
];

const DAY_OPTIONS = [
  { value: 'WEEKDAY', label: 'Ngày thường (T2 – T5)' },
  { value: 'WEEKEND', label: 'Cuối tuần (T6 – CN)' },
  { value: 'HOLIDAY', label: 'Ngày lễ' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang áp dụng' },
  { value: 'INACTIVE', label: 'Không áp dụng' },
  { value: 'HIDDEN', label: 'Ẩn' },
];

export default function CreateTicketPricePage({
  onBack,
  initialData,
  onSave,
  onBatchSave,
  isOnlineMode,
}) {
  useLocation().pathname.startsWith('/staff');

  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    audienceType: initialData?.audienceType || 'ADULT',
    seatType: initialData?.seatType || (isOnlineMode ? 'ONLINE' : 'NORMAL'),
    roomType: initialData?.roomType || (isOnlineMode ? 'ONLINE' : 'LO_RAP'),
    dayType: initialData?.dayType || 'WEEKDAY',
    price: initialData?.price || '',
    effectiveFrom: initialData?.effectiveFrom || '',
    effectiveTo: initialData?.effectiveTo || '',
    status: initialData?.status || 'ACTIVE',
  });

  const [batchPrices, setBatchPrices] = useState({});

  const addToast = useToastStore((state) => state.addToast);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const resetKey1 = JSON.stringify([initialData, isOnlineMode]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    if (initialData) {
      setFormData({
        audienceType: initialData.audienceType || 'ADULT',
        seatType: initialData.seatType || (isOnlineMode ? 'ONLINE' : 'NORMAL'),
        roomType: initialData.roomType || (isOnlineMode ? 'ONLINE' : 'LO_RAP'),
        dayType: initialData.dayType || 'WEEKDAY',
        price: initialData.price || '',
        effectiveFrom: initialData.effectiveFrom || '',
        effectiveTo: initialData.effectiveTo || '',
        status: initialData.status || 'ACTIVE',
      });
      setErrors({});
    } else {
      setFormData((prev) => ({
        ...prev,
        seatType: isOnlineMode ? 'ONLINE' : 'NORMAL',
        roomType: isOnlineMode ? 'ONLINE' : 'LO_RAP',
      }));
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'roomType') {
      let nextSeatType = formData.seatType;
      if (newValue === 'LO_BED') {
        nextSeatType = 'BED';
      } else if (nextSeatType === 'BED') {
        nextSeatType = 'NORMAL';
      }
      setFormData({ ...formData, roomType: newValue, seatType: nextSeatType });
      if (errors['roomType'])
        setErrors((prev) => ({ ...prev, roomType: false }));
      if (errors['seatType'])
        setErrors((prev) => ({ ...prev, seatType: false }));
      return;
    }

    if (name === 'price') {
      newValue = newValue.replace(/[^0-9]/g, '');
      if (newValue !== '' && Number(newValue) > 50000000) {
        addToast({
          message: 'Giá gốc tối đa là 50.000.000 VNĐ',
          type: 'error',
        });
        return;
      }
    }

    if (name === 'effectiveFrom' && newValue && formData.effectiveTo) {
      if (new Date(newValue) >= new Date(formData.effectiveTo)) {
        addToast({
          message: 'Ngày bắt đầu không được bằng hoặc sau ngày kết thúc',
          type: 'error',
        });
        return;
      }
    }

    if (name === 'effectiveTo' && newValue && formData.effectiveFrom) {
      if (new Date(newValue) <= new Date(formData.effectiveFrom)) {
        addToast({
          message: 'Ngày kết thúc không được bằng hoặc trước ngày bắt đầu',
          type: 'error',
        });
        return;
      }
    }

    setFormData({ ...formData, [name]: newValue });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const handleBatchPriceChange = (seatType, dayType, val) => {
    let newValue = val.replace(/[^0-9]/g, '');
    if (newValue !== '' && Number(newValue) > 50000000) {
      addToast({ message: 'Giá gốc tối đa là 50.000.000 VNĐ', type: 'error' });
      return;
    }
    setBatchPrices((prev) => ({
      ...prev,
      [`${seatType}_${dayType}`]: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditMode || isOnlineMode) {
      const newErrors = {};
      if (
        !formData.price ||
        Number(formData.price) <= 0 ||
        Number(formData.price) > 50000000
      ) {
        newErrors.price = 'Giá vé phải từ 1 đến 50.000.000 VNĐ';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        addToast({ message: Object.values(newErrors)[0], type: 'error' });
        return;
      }
      setErrors({});
      setIsSaving(true);
      if (onSave) {
        await onSave({
          ...formData,
          price: Number(formData.price),
          effectiveFrom: formData.effectiveFrom || null,
          effectiveTo: formData.effectiveTo || null,
        });
      }
      setIsSaving(false);
    } else {
      // Batch mode
      const entries = Object.entries(batchPrices).filter(
        ([, price]) => price && Number(price) > 0
      );
      if (entries.length === 0) {
        addToast({
          message: 'Vui lòng điền ít nhất một mức giá hợp lệ (> 0) trong bảng.',
          type: 'error',
        });
        return;
      }

      setIsSaving(true);
      if (onBatchSave) {
        const formDataList = entries.map(([key, priceStr]) => {
          const [seatType, dayType] = key.split('_');
          return {
            ...formData,
            seatType,
            dayType,
            price: Number(priceStr),
            effectiveFrom: formData.effectiveFrom || null,
            effectiveTo: formData.effectiveTo || null,
          };
        });
        await onBatchSave(formDataList);
      }
      setIsSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: '"Inter", sans-serif',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    marginBottom: '8px',
    fontWeight: 500,
  };

  const filteredSeatOptions =
    formData.roomType === 'LO_BED'
      ? SEAT_OPTIONS.filter((opt) => opt.value === 'BED')
      : SEAT_OPTIONS.filter((opt) => opt.value !== 'BED');

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
              {isEditMode ? 'Chỉnh sửa giá vé' : 'Thêm giá vé mới'}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                margin: '2px 0 0 0',
              }}
            >
              {isEditMode
                ? 'Cập nhật thông tin giá vé'
                : 'Thiết lập mức giá vé mới'}
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
          {isSaving ? 'Đang lưu...' : 'Lưu giá vé'}
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
        {/* Layout for Offline (Cinema) */}
        {!isOnlineMode ? (
          <>
            {/* Common Fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px',
              }}
            >
              <div>
                <label style={labelStyle}>Đối tượng *</label>
                <select
                  name="audienceType"
                  value={formData.audienceType}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  {AUDIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Phòng chiếu *</label>
                <select
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  {ROOM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Trạng thái *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isEditMode ? (
              /* Single Edit Mode */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px',
                }}
              >
                <div>
                  <label style={labelStyle}>Loại ghế *</label>
                  <select
                    name="seatType"
                    value={formData.seatType}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    {filteredSeatOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Ngày áp dụng *</label>
                  <select
                    name="dayType"
                    value={formData.dayType}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    {DAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Giá (VNĐ) *</label>
                  <input
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="75000"
                    style={{
                      ...inputStyle,
                      borderColor: errors.price
                        ? '#dc2626'
                        : 'rgba(255,255,255,0.1)',
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Batch Create Mode */
              <div
                style={{
                  marginTop: '16px',
                  background: '#1a1a1a',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <h3
                  style={{
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: '0 0 16px 0',
                  }}
                >
                  Bảng giá vé (Nhập đồng loạt)
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `120px repeat(${DAY_OPTIONS.length}, 1fr)`,
                    gap: '12px',
                  }}
                >
                  {/* Header Row */}
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '8px',
                    }}
                  >
                    Loại ghế \ Ngày
                  </div>
                  {DAY_OPTIONS.map((day) => (
                    <div
                      key={day.value}
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '8px',
                        textAlign: 'center',
                      }}
                    >
                      {day.label}
                    </div>
                  ))}

                  {/* Rows for Seat Types */}
                  {filteredSeatOptions.map((seat) => (
                    <React.Fragment key={seat.value}>
                      <div
                        style={{
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                        }}
                      >
                        {seat.label}
                      </div>
                      {DAY_OPTIONS.map((day) => (
                        <div key={`${seat.value}_${day.value}`}>
                          <input
                            type="text"
                            placeholder="Giá (VNĐ)"
                            value={
                              batchPrices[`${seat.value}_${day.value}`] || ''
                            }
                            onChange={(e) =>
                              handleBatchPriceChange(
                                seat.value,
                                day.value,
                                e.target.value
                              )
                            }
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: '#222',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '13px',
                              outline: 'none',
                              textAlign: 'center',
                              fontFamily: '"Inter", sans-serif',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Layout for Online */
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
              }}
            >
              <div>
                <label style={labelStyle}>Trạng thái *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Giá (VNĐ) *</label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="45000"
                  style={{
                    ...inputStyle,
                    borderColor: errors.price
                      ? '#dc2626'
                      : 'rgba(255,255,255,0.1)',
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Row 4: Hiệu lực từ | Hiệu lực đến */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
          }}
        >
          <div>
            <label style={labelStyle}>
              <Calendar
                size={12}
                style={{ display: 'inline', marginRight: 4 }}
              />
              Hiệu lực từ ngày{' '}
              <span
                style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}
              >
                (để trống = áp dụng ngay)
              </span>
            </label>
            <input
              type="date"
              name="effectiveFrom"
              value={formData.effectiveFrom}
              max={formData.effectiveTo || undefined}
              onChange={handleChange}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              <Calendar
                size={12}
                style={{ display: 'inline', marginRight: 4 }}
              />
              Hiệu lực đến ngày{' '}
              <span
                style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}
              >
                (để trống = vô thời hạn)
              </span>
            </label>
            <input
              type="date"
              name="effectiveTo"
              value={formData.effectiveTo}
              min={formData.effectiveFrom || undefined}
              onChange={handleChange}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
