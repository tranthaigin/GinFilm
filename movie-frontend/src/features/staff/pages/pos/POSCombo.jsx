import React, { useState, useEffect } from 'react';
import { apiGet } from '../../../../shared/api/client';
import ENDPOINTS from '../../../../shared/api/endpoints';
import { posApi } from '../../api/posApi';
import { Plus, Minus, Popcorn, CupSoda, ShoppingBag } from 'lucide-react';

export default function POSCombo({ bookingData, onNext, onBack }) {
  const [combos, setCombos] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGet('/admin/combos')
      .then(res => setCombos(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateQuantity = (comboId, delta) => {
    setQuantities(prev => {
      const current = prev[comboId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [comboId]: next };
    });
  };

  const handleContinue = async () => {
    const comboItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ comboId: id, quantity: qty }));

    if (comboItems.length === 0) {
      onNext({ comboItems: [], comboPrice: 0 });
      return;
    }

    try {
      setUpdating(true);
      // Backend expects { combos: [...] }
      const res = await posApi.updateCombo(bookingData.bookingId, { combos: comboItems });
      
      // Tính lại tiền combo
      let comboPrice = 0;
      comboItems.forEach(item => {
        const c = combos.find(x => x.id === item.comboId);
        if (c) comboPrice += c.price * item.quantity;
      });

      onNext({ comboItems, comboPrice });
    } catch (err) {
      console.error(err);
      alert('Lỗi khi thêm combo');
    } finally {
      setUpdating(false);
    }
  };

  const totalComboPrice = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const c = combos.find(x => x.id === id);
    return sum + (c ? c.price * qty : 0);
  }, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-1 bg-white dark:bg-[#18181b] rounded-2xl border border-transparent dark:border-white/10 shadow-sm dark:shadow-none p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
          <Popcorn size={24} className="text-[#dc2626]" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white m-0">Chọn Bắp Nước</h3>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-white/50">Đang tải danh sách combo...</div>
          ) : combos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/40">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>Chưa có combo nào được bán.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {combos.map(combo => (
                <div key={combo.id} className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col hover:border-gray-300 dark:hover:border-white/20 transition-all">
                  <div className="aspect-square bg-gray-200 dark:bg-white/5 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {combo.imageUrl ? (
                      <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
                    ) : (
                      <CupSoda size={40} className="text-gray-400 dark:text-white/20" />
                    )}
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{combo.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-white/50 line-clamp-2 mb-3 flex-1">{combo.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-200 dark:border-white/10">
                    <span className="font-bold text-[#dc2626]">
                      {combo.price.toLocaleString('vi-VN')}đ
                    </span>
                    <div className="flex items-center gap-3 bg-gray-200 dark:bg-white/5 rounded-lg p-1">
                      <button 
                        onClick={() => updateQuantity(combo.id, -1)}
                        disabled={!quantities[combo.id]}
                        className="w-7 h-7 rounded bg-white dark:bg-white/10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/20 transition-colors text-gray-700 dark:text-white shadow-sm dark:shadow-none"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-4 text-center text-sm font-bold text-gray-900 dark:text-white">{quantities[combo.id] || 0}</span>
                      <button 
                        onClick={() => updateQuantity(combo.id, 1)}
                        className="w-7 h-7 rounded bg-[#dc2626] flex items-center justify-center hover:bg-[#c01d44] transition-colors text-white shadow-sm dark:shadow-none"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[320px] bg-white dark:bg-[#18181b] rounded-2xl border border-transparent dark:border-white/10 shadow-sm dark:shadow-none p-6 flex flex-col flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-4 mb-6">Tóm Tắt Đơn</h3>
        
        <div className="flex-1 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-white/60">Tiền vé:</span>
            <span className="font-bold text-gray-900 dark:text-white">{(bookingData.totalSeatPrice || 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-white/60">Tiền combo:</span>
            <span className="font-bold text-gray-900 dark:text-white">{totalComboPrice.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
            <span className="text-gray-800 dark:text-white/80 font-medium">Tổng cộng:</span>
            <span className="text-xl font-bold text-[#dc2626]">
              {((bookingData.totalSeatPrice || 0) + totalComboPrice).toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>

        <div className="mt-auto pt-6 space-y-3">
          <button 
            onClick={handleContinue}
            disabled={updating}
            className="w-full py-3.5 rounded-xl font-bold bg-[#dc2626] text-white hover:bg-[#c01d44] transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 shadow-md dark:shadow-none"
          >
            {updating ? 'Đang cập nhật...' : 'Tiếp Tục'}
          </button>
          
          <button 
            onClick={onBack} 
            disabled={updating}
            className="w-full py-3.5 rounded-xl font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
}
