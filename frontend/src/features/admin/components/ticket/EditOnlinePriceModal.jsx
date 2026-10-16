import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useToastStore } from '../../hooks/useToastStore';

export default function EditOnlinePriceModal({ movie, onClose, onSave }) {
  const pi = movie.priceInfo || {};
  const defaultValidity = (movie.duration ? movie.duration + 60 : 180);

  // Check if a custom non-default duration was set by admin
  const isCustom = pi.validityPeriodMinutes &&
    pi.validityPeriodMinutes !== defaultValidity &&
    pi.validityPeriodMinutes !== (movie.duration + 80) &&
    pi.validityPeriodMinutes !== (movie.duration + 60);

  const [formData, setFormData] = useState({
    basePrice: pi.basePrice || '',
    discountPercentage: pi.discountPercentage || 0,
    promoStartDate: pi.promoStartDate ? pi.promoStartDate.substring(0, 16) : '',
    promoEndDate: pi.promoEndDate ? pi.promoEndDate.substring(0, 16) : '',
    validityPeriodMinutes: isCustom ? pi.validityPeriodMinutes : 0,
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'basePrice' || name === 'discountPercentage' || name === 'validityPeriodMinutes') {
      newValue = newValue.replace(/[^0-9]/g, '');
    }

    if (name === 'basePrice' && newValue !== '' && Number(newValue) > 50000000) {
      addToast({ message: 'Giá bán gốc tối đa là 50.000.000 VNĐ', type: 'error' });
      return;
    }

    if (name === 'promoStartDate' && newValue && formData.promoEndDate) {
      if (new Date(newValue) >= new Date(formData.promoEndDate)) {
        addToast({ message: 'Ngày bắt đầu không được bằng hoặc sau ngày kết thúc', type: 'error' });
        return;
      }
    }
    if (name === 'promoEndDate' && newValue && formData.promoStartDate) {
      if (new Date(newValue) <= new Date(formData.promoStartDate)) {
        addToast({ message: 'Ngày kết thúc không được bằng hoặc trước ngày bắt đầu', type: 'error' });
        return;
      }
    }

    setFormData({ ...formData, [name]: newValue });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.basePrice || Number(formData.basePrice) <= 0 || Number(formData.basePrice) > 50000000) {
      newErrors.basePrice = 'Giá bán gốc phải từ 1 đến 50.000.000 VNĐ';
    }
    if (formData.discountPercentage !== '' && (Number(formData.discountPercentage) < 0 || Number(formData.discountPercentage) > 100)) {
      newErrors.discountPercentage = 'Giảm giá phải từ 0 đến 100%';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({ message: Object.values(newErrors)[0], type: 'error' });
      return;
    }

    const valMins = Number(formData.validityPeriodMinutes);
    const finalValidity = (!valMins || valMins <= 0) ? defaultValidity : valMins;

    setIsSaving(true);
    await onSave({
      ...formData,
      basePrice: Number(formData.basePrice),
      discountPercentage: Number(formData.discountPercentage),
      promoStartDate: formData.promoStartDate ? formData.promoStartDate + ':00' : null,
      promoEndDate: formData.promoEndDate ? formData.promoEndDate + ':00' : null,
      validityPeriodMinutes: finalValidity,
    });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[540px] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 shadow-2xl transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#141414]">
          <div>
            <h3 className="m-0 text-lg font-bold text-gray-900 dark:text-white">Thiết lập giá & Khuyến mãi</h3>
            <p className="m-0 mt-1 text-xs text-gray-500 dark:text-white/50">
              Phim: <strong className="text-gray-800 dark:text-white">{movie.title}</strong> ({movie.duration || 0} phút)
            </p>
          </div>
          <button onClick={onClose} className="p-1 border-none bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 bg-white dark:bg-[#141414]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-white/70 mb-2">Giá bán gốc (VNĐ) *</label>
              <input
                type="text"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleChange}
                placeholder="Ví dụ: 50000"
                className={`w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border ${errors.basePrice ? 'border-red-500' : 'border-gray-300 dark:border-white/10'} rounded-xl text-gray-900 dark:text-white text-sm outline-none transition-colors`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-white/70 mb-2">% Giảm giá</label>
              <input
                type="text"
                name="discountPercentage"
                value={formData.discountPercentage}
                onChange={handleChange}
                placeholder="0 - 100"
                className={`w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border ${errors.discountPercentage ? 'border-red-500' : 'border-gray-300 dark:border-white/10'} rounded-xl text-gray-900 dark:text-white text-sm outline-none transition-colors`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-white/70 mb-2">Thời lượng gốc (Mặc định)</label>
              <input
                type="text"
                disabled
                value={`${defaultValidity} Phút`}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-white/50 text-sm cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-white/70 mb-2">Thời lượng vé tùy chỉnh (Phút)</label>
              <input
                type="text"
                name="validityPeriodMinutes"
                value={formData.validityPeriodMinutes}
                onChange={handleChange}
                placeholder={`Nhập 0 hoặc bỏ trống để nhận ${defaultValidity}p`}
                className={`w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border ${errors.validityPeriodMinutes ? 'border-red-500' : 'border-gray-300 dark:border-white/10'} rounded-xl text-gray-900 dark:text-white text-sm outline-none transition-colors`}
              />
              <span className="text-[11px] text-gray-500 dark:text-white/40 mt-1 block">
                * Nếu bỏ trống hoặc nhập 0, hệ thống sẽ áp dụng thời lượng gốc ({defaultValidity} Phút)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-white/70 mb-2">Khuyến mãi từ ngày</label>
              <input
                type="datetime-local"
                name="promoStartDate"
                value={formData.promoStartDate}
                max={formData.promoEndDate || undefined}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-white/70 mb-2">Khuyến mãi đến ngày</label>
              <input
                type="datetime-local"
                name="promoEndDate"
                value={formData.promoEndDate}
                min={formData.promoStartDate || undefined}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3 bg-white dark:bg-[#141414]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-700 dark:text-white text-sm font-semibold cursor-pointer transition-colors shadow-sm"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-transparent bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
