import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';

export default function CreateComboPage({ onBack, initialData, onSave }) {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    price: initialData?.price || '',
    status: initialData?.status || 'IN_STOCK',
    imageUrl: initialData?.imageUrl || '',
    description: initialData?.description || '',
    discountPercent: initialData?.originalDiscountPercent !== undefined ? initialData.originalDiscountPercent : (initialData?.discountPercent || 0),
    discountStartDate: initialData?.discountStartDate ? initialData.discountStartDate.substring(0, 16) : '',
    discountEndDate: initialData?.discountEndDate ? initialData.discountEndDate.substring(0, 16) : '',
  });

  const addToast = useToastStore((state) => state.addToast);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        price: initialData.price || '',
        status: initialData.status || 'IN_STOCK',
        imageUrl: initialData.imageUrl || '',
        description: initialData.description || '',
        discountPercent: initialData.originalDiscountPercent !== undefined ? initialData.originalDiscountPercent : (initialData.discountPercent || 0),
        discountStartDate: initialData.discountStartDate ? initialData.discountStartDate.substring(0, 16) : '',
        discountEndDate: initialData.discountEndDate ? initialData.discountEndDate.substring(0, 16) : '',
      });
      setImagePreview(initialData.imageUrl || null);
      setImageFile(null);
      setErrors({});
    }
  }, [initialData]);


  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (file) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    } else {
      let newValue = value;
      if (name === 'name') {
        newValue = newValue.replace(/[!@#$%^&*()_+={}\[\]|\\<>\/?~`]/g, '');
      }

      if (name === 'price') {
        newValue = newValue.replace(/[^0-9]/g, '');
        if (newValue !== '' && Number(newValue) > 50000000) {
          addToast({ message: 'Giá gốc tối đa là 50.000.000 VNĐ', type: 'error' });
          return;
        }
      }

      if (name === 'discountPercent') {
        newValue = newValue.replace(/[^0-9]/g, '');
      }

      if (name === 'discountStartDate' && newValue && formData.discountEndDate) {
        if (new Date(newValue) >= new Date(formData.discountEndDate)) {
          addToast({ message: 'Ngày bắt đầu không được bằng hoặc sau ngày kết thúc', type: 'error' });
          return;
        }
      }
      
      if (name === 'discountEndDate' && newValue && formData.discountStartDate) {
        if (new Date(newValue) <= new Date(formData.discountStartDate)) {
          addToast({ message: 'Ngày kết thúc không được bằng hoặc trước ngày bắt đầu', type: 'error' });
          return;
        }
      }

      setFormData(prev => ({ ...prev, [name]: newValue }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
      if (errors.dateOrder) setErrors((prev) => ({ ...prev, dateOrder: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name || formData.name.trim() === '') newErrors.name = 'Vui lòng nhập tên combo';
    if (!formData.price || formData.price <= 0 || formData.price > 50000000) {
      newErrors.price = 'Giá gốc phải từ 1 đến 50.000.000 VNĐ';
    }
    if (formData.discountPercent !== '' && (formData.discountPercent < 0 || formData.discountPercent > 100)) {
      newErrors.discountPercent = 'Giảm giá phải từ 0 - 100%';
    }
    if (formData.discountStartDate && formData.discountEndDate) {
      if (new Date(formData.discountStartDate) >= new Date(formData.discountEndDate)) {
        newErrors.dateOrder = 'Ngày kết thúc phải lớn hơn ngày bắt đầu';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({ message: Object.values(newErrors)[0], type: 'error' });
      return;
    }
    
    setErrors({});
    setIsSaving(true);
    
    if (onSave) {
      const dataToSave = {
        name: formData.name,
        price: parseInt(formData.price),
        status: formData.status,
        imageUrl: formData.imageUrl,
        description: formData.description,
      };
      
      dataToSave.discountPercent = parseInt(formData.discountPercent) || 0;
      if (formData.discountStartDate) dataToSave.discountStartDate = formData.discountStartDate + ':00';
      if (formData.discountEndDate) dataToSave.discountEndDate = formData.discountEndDate + ':00';

      await onSave(dataToSave, imageFile);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: 0 }}>
              {isEditMode ? 'Chỉnh sửa Combo' : 'Thêm Combo mới'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0 0' }}>
              {isEditMode ? 'Cập nhật thông tin combo, giá cả và ưu đãi' : 'Nhập thông tin combo mới'}
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
            background: isSaving ? '#6b7280' : 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: isSaving ? 'none' : '0 4px 12px rgba(220,38,38,0.3)',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <Save size={16} />
          {isSaving ? 'Đang lưu...' : 'Lưu Combo'}
        </button>
      </div>

      <div
        style={{
          background: '#141414',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Tên Combo *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="VD: Combo 2 người"
              style={{ ...inputStyle, borderColor: errors.name ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
            {errors.name && <span style={{color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block'}}>{errors.name}</span>}
          </div>

          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Giá gốc (VNĐ) *</label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="VD: 95000"
              style={{ ...inputStyle, borderColor: errors.price ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
            {errors.price && <span style={{color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block'}}>{errors.price}</span>}
          </div>

          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Giảm giá (%)</label>
            <input
              type="text"
              name="discountPercent"
              value={formData.discountPercent}
              onChange={handleChange}
              placeholder="VD: 10"
              style={{ ...inputStyle, borderColor: errors.discountPercent ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
            {errors.discountPercent && <span style={{color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block'}}>{errors.discountPercent}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Ngày bắt đầu giảm giá</label>
            <input
              type="datetime-local"
              name="discountStartDate"
              value={formData.discountStartDate}
              max={formData.discountEndDate || undefined}
              onChange={handleChange}
              style={{ ...inputStyle, colorScheme: 'dark', borderColor: errors.dateOrder ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Ngày kết thúc giảm giá</label>
            <input
              type="datetime-local"
              name="discountEndDate"
              value={formData.discountEndDate}
              min={formData.discountStartDate || undefined}
              onChange={handleChange}
              style={{ ...inputStyle, colorScheme: 'dark', borderColor: errors.dateOrder ? '#dc2626' : 'rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>
        {errors.dateOrder && <span style={{color: '#dc2626', fontSize: '11px', display: 'block'}}>{errors.dateOrder}</span>}

        <div>
          <label style={labelStyle}>Mô tả Combo</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Bao gồm: 1 Bắp Lớn + 2 Nước Ngọt..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={labelStyle}>Ảnh sản phẩm (Tải lên)</label>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              style={{ ...inputStyle, padding: '7px 12px', background: 'transparent' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '32px', marginTop: '16px', alignItems: 'center' }}>
            {isEditMode && initialData?.imageUrl && (
              <div style={{ width: '180px', flexShrink: 0 }}>
                <label style={{ ...labelStyle, fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Ảnh cũ</label>
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    borderRadius: '8px',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={initialData.imageUrl}
                    alt="Old Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)' }}>
                    <ImageIcon size={24} />
                    <span style={{ fontSize: '11px', textAlign: 'center', padding: '0 8px' }}>Không tải được ảnh cũ.</span>
                  </div>
                </div>
              </div>
            )}

            {isEditMode && initialData?.imageUrl && imagePreview && imageFile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '24px' }}>
                <ArrowRight size={32} color="rgba(255,255,255,0.3)" />
              </div>
            )}

            {imagePreview && imageFile && (
              <div style={{ width: '180px', flexShrink: 0 }}>
                <label style={{ ...labelStyle, fontSize: '14px', color: '#10B981', fontWeight: 600 }}>{isEditMode ? 'Ảnh mới' : 'Xem trước ảnh'}</label>
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    borderRadius: '8px',
                    background: '#1a1a1a',
                    border: '1px solid #10B981',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="New Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)' }}>
                    <ImageIcon size={24} />
                    <span style={{ fontSize: '11px', textAlign: 'center', padding: '0 8px' }}>Không tải được ảnh.</span>
                  </div>
                </div>
              </div>
            )}
            
            {!isEditMode && imagePreview && !imageFile && (
              <div style={{ width: '180px', flexShrink: 0 }}>
                <label style={{ ...labelStyle, fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Xem trước ảnh</label>
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    borderRadius: '8px',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
