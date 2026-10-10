import { useState, useEffect } from 'react';
import { Sliders, Coins, ShieldAlert, Edit2, Check, X, Info, Settings2, Clock } from 'lucide-react';
import { useToastStore } from '../../user/store/toastStore';
import { getConfigs, updateConfig } from '../../user/api/services/systemConfigService';

const VIP_POLICY_KEYS = new Set([
  'VIP_REVIEW_PERIOD_MONTHS',
  'VIP_1_MIN_POINTS',
  'VIP_2_MIN_POINTS',
  'VIP_3_MIN_POINTS',
  'VIP_1_REQUIRED_EARNED_POINTS',
  'VIP_2_REQUIRED_EARNED_POINTS',
  'VIP_3_REQUIRED_EARNED_POINTS',
  'VIP_1_PENALTY_POINTS',
  'VIP_2_PENALTY_POINTS',
  'VIP_3_PENALTY_POINTS',
  'VIP_MEMBERSHIP_STATE_VERSION',
]);

const CONFIG_METADATA = {
  MIN_RLF_POINTS: {
    title: 'Số điểm RLF tối thiểu',
    subtitle: 'Số điểm ít nhất người dùng cần nhập cho mỗi lần áp dụng trừ điểm',
    unit: 'điểm',
    icon: Coins,
    theme: {
      iconBg: 'bg-red-500/10 border-red-500/20 text-red-500',
      badgeBg: 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    },
    formatValue: (val) => `${Number(val || 0).toLocaleString('vi-VN')} điểm`,
    placeholder: 'Ví dụ: 10'
  },
  MIN_CASH_VND: {
    title: 'Tiền mặt tối thiểu giữ lại cho vé',
    subtitle: 'Số tiền tối thiểu khách hàng bắt buộc phải trả tiền mặt sau khi khấu trừ điểm',
    unit: 'VNĐ',
    icon: ShieldAlert,
    theme: {
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    },
    formatValue: (val) => `${Number(val || 0).toLocaleString('vi-VN')} VNĐ`,
    placeholder: 'Ví dụ: 7000'
  },
  DEFAULT_VOD_BUFFER_MINUTES: {
    title: 'Thời gian bù giờ mặc định cho vé VOD',
    subtitle: 'Số phút bù giờ hệ thống tự động cộng thêm vào thời lượng phim cho vé xem trực tuyến',
    unit: 'phút',
    icon: Clock,
    theme: {
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    formatValue: (val) => `${Number(val || 0).toLocaleString('vi-VN')} phút`,
    placeholder: 'Ví dụ: 60'
  }
};

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    let isActive = true;

    const loadConfigs = async () => {
      try {
        const data = await getConfigs();
        if (!isActive) return;

        setConfigs(data);
      } catch (error) {
        console.error(error);
        if (isActive) showToast('Lỗi khi tải cấu hình hệ thống', 'error');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadConfigs();
    return () => {
      isActive = false;
    };
  }, [showToast]);

  const updateConfigsLocally = (updates) => {
    setConfigs((currentConfigs) => {
      const currentKeys = new Set(currentConfigs.map(({ key }) => key));
      const updatedConfigs = currentConfigs.map((config) => (
        Object.prototype.hasOwnProperty.call(updates, config.key)
          ? { ...config, value: String(updates[config.key]) }
          : config
      ));
      const newConfigs = Object.entries(updates)
        .filter(([key]) => !currentKeys.has(key))
        .map(([key, value]) => ({ key, value: String(value) }));

      return [...updatedConfigs, ...newConfigs];
    });
  };

  const handleUpdate = async (key, newValue) => {
    try {
      await updateConfig(key, String(newValue));
      updateConfigsLocally({ [key]: newValue });
      showToast('Cập nhật cấu hình thành công', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Lỗi khi cập nhật cấu hình', 'error');
    }
  };

  const nonVipConfigs = configs.filter(({ key }) => !VIP_POLICY_KEYS.has(key));

  const minRlf = configs.find(c => c.key === 'MIN_RLF_POINTS')?.value || '10';
  const minCash = configs.find(c => c.key === 'MIN_CASH_VND')?.value || '7000';
  const vodBuffer = configs.find(c => c.key === 'DEFAULT_VOD_BUFFER_MINUTES')?.value || '60';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#9D9D9D]">
        <div className="flex items-center gap-3 bg-[#141414] px-6 py-4 rounded-2xl border border-white/10 shadow-xl">
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-white/80">Đang tải danh sách quy tắc...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30">
            <Sliders size={24} color="#fff" />
          </div>
          <div>
            <h2 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              Cấu Hình Quy Tắc Điểm & Hệ Thống
            </h2>
            <p className="text-white/50 text-xs sm:text-sm font-medium mt-0.5">
              Thiết lập quy tắc điểm RLF, thanh toán tối thiểu và thời gian gia hạn vé VOD
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-white/10 hover:border-red-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Điểm RLF Tối Thiểu</p>
            <h3 className="text-xl font-black text-white mt-0.5">
              {Number(minRlf).toLocaleString('vi-VN')} <span className="text-xs text-red-400 font-semibold">điểm</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 hover:border-amber-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Tiền Mặt Giữ Tối Thiểu</p>
            <h3 className="text-xl font-black text-white mt-0.5">
              {Number(minCash).toLocaleString('vi-VN')} <span className="text-xs text-amber-400 font-semibold">VNĐ</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 hover:border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Bù Giờ Vé VOD</p>
            <h3 className="text-xl font-black text-white mt-0.5">
              {Number(vodBuffer).toLocaleString('vi-VN')} <span className="text-xs text-emerald-400 font-semibold">phút</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 hover:border-blue-500/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Settings2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Tổng Tham Số</p>
            <h3 className="text-xl font-black text-white mt-0.5">
              {nonVipConfigs.length} <span className="text-xs text-blue-400 font-semibold">quy tắc</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        style={{
          background: 'linear-gradient(180deg, #161616 0%, #111111 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}
        className="overflow-x-auto custom-scrollbar"
      >
        <table className="w-full border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              <th className="px-6 py-4 text-left text-[11px] font-extrabold text-white/50 uppercase tracking-wider">
                Tên Quy Tắc & Tham Số
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-extrabold text-white/50 uppercase tracking-wider w-[210px]">
                Giá Trị Hiện Tại
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-extrabold text-white/50 uppercase tracking-wider">
                Mô Tả Chi Tiết Nghiệp Vụ
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-extrabold text-white/50 uppercase tracking-wider w-[140px]">
                Thao Tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {nonVipConfigs.map((config) => (
              <ConfigRow key={config.key} config={config} onUpdate={handleUpdate} />
            ))}
            {nonVipConfigs.length === 0 && (
              <tr>
                <td colSpan="4" className="p-12 text-center text-white/40 text-sm">
                  Chưa có dữ liệu quy tắc hệ thống.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Instruction Note Card */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-white/70 shadow-md">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
          <Info size={18} />
        </div>
        <div className="leading-relaxed">
          <span className="font-bold text-white uppercase tracking-wider text-[11px] mr-1.5">Lưu ý quản trị hệ thống:</span>
          Mọi chỉnh sửa tại đây sẽ có hiệu lực tức thì trên phân hạng thành viên, thanh toán Checkout và luồng phát vé Phim trực tuyến. Vui lòng cân nhắc kỹ trước khi bấm Lưu.
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ config, onUpdate }) {
  const meta = CONFIG_METADATA[config.key] || {};
  const theme = meta.theme || {
    iconBg: 'bg-white/5 border-white/10 text-white/70',
    badgeBg: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const [value, setValue] = useState(config.value);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    const trimmed = String(value).trim();
    if (!trimmed || isNaN(Number(trimmed)) || Number(trimmed) < 0) {
      alert('Vui lòng nhập một số không âm hợp lệ.');
      return;
    }
    if (trimmed !== config.value) {
      onUpdate(config.key, trimmed);
    }
    setIsEditing(false);
  };

  const IconComp = meta.icon || Settings2;
  const displayTitle = meta.title || config.key;
  const displayValue = meta.formatValue ? meta.formatValue(config.value) : config.value;

  return (
    <tr className="hover:bg-white/[0.03] transition-all duration-200">
      {/* Rule Name Column */}
      <td className="px-6 py-5">
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${theme.iconBg}`}>
            <IconComp size={20} />
          </div>
          <div>
            <div className="font-bold text-white text-[14px] tracking-tight">{displayTitle}</div>
          </div>
        </div>
      </td>

      {/* Value Column */}
      <td className="px-6 py-5">
        {isEditing ? (
          <div className="flex items-center gap-2 max-w-[190px]">
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meta.placeholder || 'Nhập giá trị'}
              className="w-full bg-[#0a0a0a] border border-red-500 rounded-xl px-3.5 py-1.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-red-500/30 transition-all shadow-inner"
              autoFocus
            />
            {meta.unit && <span className="text-xs text-white/50 font-semibold shrink-0">{meta.unit}</span>}
          </div>
        ) : (
          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border transition-transform duration-200 hover:scale-105 ${theme.badgeBg}`}>
            {displayValue}
          </span>
        )}
      </td>

      {/* Description Column */}
      <td className="px-6 py-5 text-xs text-white/70 max-w-md leading-relaxed font-normal">
        {config.description || meta.subtitle || 'Không có mô tả.'}
      </td>

      {/* Action Column */}
      <td className="px-6 py-5 text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleSave}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500 hover:text-white border border-green-500/20 hover:border-green-500 text-green-600 dark:text-green-400 text-xs font-semibold transition-all duration-200"
            >
              <Check size={14} />
              Lưu
            </button>
            <button
              onClick={() => { setValue(config.value); setIsEditing(false); }}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-xs font-medium transition-all duration-200"
            >
              <X size={14} />
              Hủy
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white border border-gray-200 dark:border-white/10 hover:border-red-500 dark:hover:border-red-500 text-gray-700 dark:text-white/80 text-xs font-semibold transition-all duration-200 group shadow-sm"
          >
            <Edit2 size={13} className="text-red-500 dark:text-red-400 group-hover:text-white transition-colors" />
            Chỉnh sửa
          </button>
        )}
      </td>
    </tr>
  );
}
