import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  User,
  IdCard,
  Phone,
  CalendarDays,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  login,
  register,
  googleLogin,
  verifyAccount,
  resendVerification,
  unlockAccount,
  resendUnlockOtp,
} from '../../api/services/authService';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

import { LOGO_URL } from '../../../../shared/constants/brand';

const MONTH_NAMES = [
  'Thg 1',
  'Thg 2',
  'Thg 3',
  'Thg 4',
  'Thg 5',
  'Thg 6',
  'Thg 7',
  'Thg 8',
  'Thg 9',
  'Thg 10',
  'Thg 11',
  'Thg 12',
];

const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const DEFAULT_BIRTH_YEAR = 2000;

const GLASS_INPUT_CLASS =
  'w-full rounded-2xl border border-gray-300 dark:border-red-500/20 bg-white/90 dark:bg-black/45 px-4 py-4 text-[15px] text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-text-muted transition-all duration-300 outline-none backdrop-blur-xl focus:border-red-500 dark:focus:border-[#d77567] focus:bg-white dark:focus:bg-black/55 focus:shadow-md focus:shadow-red-500/10 focus:ring-1 focus:ring-red-500/30 dark:focus:ring-[#d77567]/30';
const GLASS_ICON_CLASS =
  'text-[17px] text-gray-800 dark:text-[#8f7d7d] transition-colors duration-200';
const GLASS_LABEL_CLASS =
  'text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 dark:text-[#d8c3c3]';

function dobToIso(value) {
  const date = parseDob(value);
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDob(value) {
  if (!value) return null;
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isFutureDate(year, month, day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(year, month, day);
  return candidate > today;
}

function normalizeMessage(message) {
  return String(message || '')
    .trim()
    .toLowerCase();
}

function extractErrorMessage(error) {
  if (!error) return '';

  const candidates = [
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.response?.data?.details,
    error?.data?.message,
    error?.message,
  ];

  const nestedErrors = error?.response?.data?.errors;
  if (Array.isArray(nestedErrors)) {
    candidates.push(...nestedErrors);
  } else if (nestedErrors && typeof nestedErrors === 'object') {
    candidates.push(...Object.values(nestedErrors));
  }

  const extracted =
    candidates
      .flatMap((item) => {
        if (Array.isArray(item)) return item;
        if (item && typeof item === 'object') return Object.values(item);
        return [item];
      })
      .find((item) => typeof item === 'string' && item.trim())
      ?.trim() || '';

  const lower = extracted.toLowerCase();
  if (
    lower.includes('brevo') ||
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('500') ||
    lower.includes('thất bại')
  ) {
    return 'Hệ thống đang gặp sự cố kết nối. Vui lòng thử lại sau.';
  }

  return extracted;
}

function mapLoginErrorMessage(error) {
  const normalized = normalizeMessage(extractErrorMessage(error));

  if (!normalized) return 'Không thể kết nối đến máy chủ.';
  if (normalized.includes('not found') || normalized.includes('không tồn tại'))
    return 'Tài khoản không tồn tại.';
  if (normalized.includes('locked') || normalized.includes('bị khóa'))
    return 'Tài khoản đã bị khóa.';
  if (
    normalized.includes('incorrect') ||
    normalized.includes('invalid') ||
    normalized.includes('sai') ||
    normalized.includes('mật khẩu') ||
    normalized.includes('email')
  ) {
    return 'Email hoặc mật khẩu không chính xác.';
  }

  return 'Không thể kết nối đến máy chủ.';
}

function mapRegisterError(error) {
  const normalized = normalizeMessage(extractErrorMessage(error));

  if (!normalized) {
    return {
      message: 'Đăng ký thất bại, vui lòng thử lại sau.',
      fieldErrors: {},
    };
  }

  if (
    normalized.includes('email') &&
    (normalized.includes('được sử dụng') ||
      normalized.includes('exists') ||
      normalized.includes('tồn tại'))
  ) {
    return {
      message: 'Email này đã được sử dụng.',
      fieldErrors: {
        email: 'Email này đã được sử dụng.',
      },
    };
  }

  if (
    (normalized.includes('username') || normalized.includes('tên đăng nhập')) &&
    (normalized.includes('được sử dụng') ||
      normalized.includes('exists') ||
      normalized.includes('tồn tại'))
  ) {
    return {
      message: 'Tên đăng nhập đã tồn tại.',
      fieldErrors: {
        username: 'Tên đăng nhập đã tồn tại.',
      },
    };
  }

  if (
    (normalized.includes('số điện thoại') || normalized.includes('phone')) &&
    (normalized.includes('liên kết') ||
      normalized.includes('được sử dụng') ||
      normalized.includes('exists') ||
      normalized.includes('tồn tại'))
  ) {
    return {
      message: 'Số điện thoại này đã được liên kết với tài khoản khác.',
      fieldErrors: {
        phoneNumber: 'Số điện thoại này đã được liên kết với tài khoản khác.',
      },
    };
  }

  if (normalized.includes('full name') || normalized.includes('họ và tên')) {
    return {
      message: 'Họ và tên chưa hợp lệ.',
      fieldErrors: {
        fullName: 'Họ và tên chưa hợp lệ.',
      },
    };
  }

  if (normalized.includes('password') || normalized.includes('mật khẩu')) {
    return {
      message: 'Mật khẩu chưa đúng yêu cầu.',
      fieldErrors: {
        password: 'Mật khẩu chưa đúng yêu cầu.',
      },
    };
  }

  return {
    message: 'Đăng ký thất bại, vui lòng kiểm tra lại thông tin.',
    fieldErrors: {
      general: 'Đăng ký thất bại, vui lòng kiểm tra lại thông tin.',
    },
  };
}

function DatePicker({ value, onChange }) {
  const today = new Date();
  const selectedDate = parseDob(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? 0);
  const [viewYear, setViewYear] = useState(
    selectedDate?.getFullYear() ?? DEFAULT_BIRTH_YEAR
  );
  const [viewMode, setViewMode] = useState('day');
  const containerRef = useRef(null);

  const MIN_YEAR = 1900;
  const MAX_YEAR = today.getFullYear();

  const goToPrevMonth = () => {
    setViewMonth((month) => {
      if (month === 0) {
        setViewYear((year) => year - 1);
        return 11;
      }
      return month - 1;
    });
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      const nextMonth = viewMonth + 1;
      if (isFutureDate(viewYear, nextMonth, 1)) return;
      setViewMonth(nextMonth);
    }
  };

  const canGoNextMonth = !isFutureDate(
    viewMonth === 11 ? viewYear + 1 : viewYear,
    viewMonth === 11 ? 0 : viewMonth + 1,
    1
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    const inactiveCellClass =
      'p-2 text-surface-alt/50 cursor-not-allowed select-none rounded-full';

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push(
        <div key={`prev-${i}`} className={inactiveCellClass}>
          {daysInPrevMonth - i}
        </div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isFutureDate(viewYear, viewMonth, day);
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === viewMonth &&
        selectedDate.getFullYear() === viewYear;

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            const formatted = `${String(day).padStart(2, '0')}/${String(viewMonth + 1).padStart(2, '0')}/${viewYear}`;
            onChange(formatted);
            setIsOpen(false);
          }}
          className={`p-2 w-8 h-8 flex items-center justify-center mx-auto rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 select-none ${
            disabled
              ? 'text-white/25 cursor-not-allowed'
              : isSelected
                ? 'bg-red-600 text-white font-bold hover:bg-red-600'
                : 'text-white hover:bg-red-500/15'
          }`}
        >
          {day}
        </button>
      );
    }

    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      cells.push(
        <div key={`next-${i}`} className={inactiveCellClass}>
          {i}
        </div>
      );
    }

    return cells;
  };

  const handleYearChange = (year) => {
    setViewYear(year);
    setViewMode('month');
  };

  const handleMonthChange = (month) => {
    setViewMonth(month);
    setViewMode('day');
  };

  const renderYearGrid = () => {
    const years = [];
    const startYear = Math.max(MIN_YEAR, viewYear - 4);
    for (let y = startYear; y <= Math.min(MAX_YEAR, startYear + 11); y++) {
      years.push(y);
    }
    return years;
  };

  const renderHeader = () => {
    if (viewMode === 'year') {
      return (
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            className="rounded p-1 text-white/60 transition-colors hover:bg-red-500/15 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            onClick={(e) => {
              e.stopPropagation();
              setViewYear((y) => Math.max(MIN_YEAR, y - 12));
            }}
          >
            <span className="material-symbols-outlined text-[20px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            className="text-[#111827] dark:text-white font-bold text-[15px] tracking-wide select-none hover:text-red-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {Math.max(MIN_YEAR, viewYear - 4)} -{' '}
            {Math.min(MAX_YEAR, Math.max(MIN_YEAR, viewYear - 4) + 11)}
          </button>
          <button
            type="button"
            className="rounded p-1 text-white/60 transition-colors hover:bg-red-500/15 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            onClick={(e) => {
              e.stopPropagation();
              setViewYear((y) => Math.min(MAX_YEAR, y + 12));
            }}
          >
            <span className="material-symbols-outlined text-[20px]">
              chevron_right
            </span>
          </button>
        </div>
      );
    }

    if (viewMode === 'month') {
      return (
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            className="rounded p-1 text-white/60 transition-colors hover:bg-red-500/15 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            onClick={(e) => {
              e.stopPropagation();
              setViewYear((y) => y - 1);
            }}
          >
            <span className="material-symbols-outlined text-[20px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            className="text-[#111827] dark:text-white font-bold text-[15px] tracking-wide select-none hover:text-red-400 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setViewMode('year');
            }}
          >
            {viewYear}
          </button>
          <button
            type="button"
            className="rounded p-1 text-white/60 transition-colors hover:bg-red-500/15 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            onClick={(e) => {
              e.stopPropagation();
              setViewYear((y) => Math.min(MAX_YEAR, y + 1));
            }}
          >
            <span className="material-symbols-outlined text-[20px]">
              chevron_right
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          className="rounded p-1 text-white/60 transition-colors hover:bg-red-500/15 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevMonth();
          }}
        >
          <span className="material-symbols-outlined text-[20px]">
            chevron_left
          </span>
        </button>
        <div className="flex gap-2 select-none">
          <button
            type="button"
            className="flex items-center gap-1 text-[#111827] dark:text-white font-bold text-[15px] tracking-wide hover:text-red-400 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setViewMode('month');
            }}
          >
            {MONTH_NAMES[viewMonth]}
            <span className="material-symbols-outlined text-[18px]">
              arrow_drop_down
            </span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1 text-[#111827] dark:text-white font-bold text-[15px] tracking-wide hover:text-red-400 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setViewMode('year');
            }}
          >
            {viewYear}
            <span className="material-symbols-outlined text-[18px]">
              arrow_drop_down
            </span>
          </button>
        </div>
        <button
          type="button"
          disabled={!canGoNextMonth}
          className={`rounded p-1 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 ${
            canGoNextMonth
              ? 'text-white/60 hover:bg-red-500/15 hover:text-white'
              : 'cursor-not-allowed text-white/20'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            goToNextMonth();
          }}
        >
          <span className="material-symbols-outlined text-[20px]">
            chevron_right
          </span>
        </button>
      </div>
    );
  };

  const renderBody = () => {
    if (viewMode === 'year') {
      return (
        <div className="grid grid-cols-3 gap-2">
          {renderYearGrid().map((year) => (
            <button
              key={year}
              type="button"
              className={`py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 border border-transparent ${
                year === viewYear
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-500/20'
                  : 'text-white/70 bg-white/5 hover:bg-red-500/15 hover:border-red-500/30 hover:text-white'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleYearChange(year);
              }}
            >
              {year}
            </button>
          ))}
        </div>
      );
    }

    if (viewMode === 'month') {
      return (
        <div className="grid grid-cols-3 gap-2">
          {MONTH_NAMES.map((month, idx) => (
            <button
              key={month}
              type="button"
              className={`py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 border border-transparent ${
                idx === viewMonth
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-500/20'
                  : 'text-white/70 bg-white/5 hover:bg-red-500/15 hover:border-red-500/30 hover:text-white'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleMonthChange(idx);
              }}
            >
              {month}
            </button>
          ))}
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-medium text-text-muted select-none">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="h-8 flex items-center justify-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {renderCalendarDays()}
        </div>
      </>
    );
  };

  return (
    <div className="group relative" ref={containerRef}>
      <CalendarDays
        className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
        size={17}
      />
      <input
        className={`${GLASS_INPUT_CLASS} cursor-pointer pl-11`}
        placeholder="dd/mm/yyyy"
        type="text"
        value={value}
        onChange={(e) => {
          let val = e.target.value.replace(/[^0-9/]/g, '');
          onChange(val);

          if (val.length >= 8) {
            const parts = val.split('/');
            if (parts.length === 3) {
              const [d, m, y] = parts.map(Number);
              if (
                !isNaN(d) &&
                !isNaN(m) &&
                !isNaN(y) &&
                m >= 1 &&
                m <= 12 &&
                y > 1900 &&
                y <= new Date().getFullYear()
              ) {
                setViewMonth(m - 1);
                setViewYear(y);
              }
            }
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (selectedDate) {
            setViewMonth(selectedDate.getMonth());
            setViewYear(selectedDate.getFullYear());
          }
          setViewMode('day');
          setIsOpen((prev) => !prev);
        }}
      />
      {isOpen && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-[#4a3a3a] bg-[#1f1a1a] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:w-[280px]"
          onClick={(e) => e.stopPropagation()}
        >
          {renderHeader()}
          {renderBody()}
        </div>
      )}
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToastStore((s) => s.showToast);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isRegisterRoute = location.pathname === '/register';
  const defaultTab = isRegisterRoute ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [visibleForm, setVisibleForm] = useState(defaultTab);
  const [formOpacity, setFormOpacity] = useState('opacity-100');
  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // ── OTP Verification Modal state ──
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpAction, setOtpAction] = useState('verify'); // 'verify' | 'unlock'
  const otpInputRefs = useRef([]);
  const cooldownTimerRef = useRef(null);

  // ── Unverified Account Modal state ──
  const [showUnverifiedModal, setShowUnverifiedModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  // Auto-focus ô OTP đầu tiên khi modal mở
  useEffect(() => {
    if (showOtpModal) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    }
  }, [showOtpModal]);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    setActiveTab(defaultTab);
    setVisibleForm(defaultTab);
    setFormOpacity('opacity-100');
    setLoginErrors({});
    setRegisterErrors({});
  }, [defaultTab]);

  const googleCallbackRef = useRef(null);

  const handleGoogleCredential = useCallback(
    async (response) => {
      if (googleSubmitting) return;
      const idToken = response.credential;
      if (!idToken) return;
      setGoogleSubmitting(true);
      try {
        await googleLogin(idToken);

        const user = useAuthStore.getState().user;
        const userName = user?.fullName || user?.username || 'bạn';

        let isAdmin = false;
        let isStaff = false;

        if (user) {
          if (typeof user.role === 'string') {
            if (user.role.toUpperCase().includes('ADMIN')) isAdmin = true;
            if (user.role.toUpperCase().includes('STAFF')) isStaff = true;
          } else if (Array.isArray(user.roles)) {
            user.roles.forEach((roleItem) => {
              let roleStr = '';
              if (typeof roleItem === 'string')
                roleStr = roleItem.toUpperCase();
              else if (typeof roleItem === 'object' && roleItem !== null)
                roleStr = String(
                  Object.values(roleItem).join(' ')
                ).toUpperCase();

              if (roleStr.includes('ADMIN')) isAdmin = true;
              if (roleStr.includes('STAFF')) isStaff = true;
            });
          } else if (Array.isArray(user.authorities)) {
            user.authorities.forEach((auth) => {
              if (typeof auth.authority === 'string') {
                const roleStr = auth.authority.toUpperCase();
                if (roleStr.includes('ADMIN')) isAdmin = true;
                if (roleStr.includes('STAFF')) isStaff = true;
              }
            });
          }
        }

        if (isAdmin) {
          showToast(
            `Đăng nhập Google thành công! Chào mừng Quản trị viên ${userName} quay trở lại.`,
            'success'
          );
          navigate('/admin');
        } else if (isStaff) {
          showToast(
            `Đăng nhập Google thành công! Chào mừng Nhân viên ${userName} bắt đầu ca làm việc.`,
            'success'
          );
          navigate('/staff');
        } else {
          showToast(
            `Đăng nhập Google thành công! Chào mừng ${userName}.`,
            'success'
          );

          // Kiểm tra xem user Google đã có PIN chưa
          try {
            const { apiGet } = await import('../../../../shared/api/client');
            const res = await apiGet('/users/pin/status');
            if (res.hasPinSetup === false) {
              navigate('/home', { state: { requirePinSetup: true } });
              return;
            }
          } catch {
            // Nếu lỗi API, không bắt setup PIN
          }
          navigate('/home');
        }
      } catch (err) {
        showToast(
          extractErrorMessage(err) || 'Đăng nhập Google thất bại.',
          'error'
        );
      } finally {
        setGoogleSubmitting(false);
      }
    },
    [navigate, showToast, googleSubmitting]
  );

  // Cập nhật ref mỗi lần callback thay đổi
  useEffect(() => {
    googleCallbackRef.current = handleGoogleCredential;
  }, [handleGoogleCredential]);

  const handleGoogleButtonClick = useCallback(() => {
    if (!window.google) {
      showToast('Google chưa sẵn sàng, vui lòng thử lại.', 'error');
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One-Tap bị block → fallback: render button ẩn rồi click
        const hiddenDiv = document.getElementById('google-btn-hidden');
        if (hiddenDiv) {
          hiddenDiv.innerHTML = '';
          window.google.accounts.id.renderButton(hiddenDiv, {
            theme: 'outline',
            size: 'large',
          });
          const btn = hiddenDiv.querySelector('div[role="button"]');
          if (btn) btn.click();
        }
      }
    });
  }, [showToast]);

  // Khởi tạo Google Identity Services sau khi callback được thiết lập
  useEffect(() => {
    const initGoogle = () => {
      if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        // Dùng window wrapper để luôn gọi version mới nhất của callback
        callback: (resp) => googleCallbackRef.current?.(resp),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.querySelector(
        'script[src*="accounts.google.com/gsi/client"]'
      );
      if (script) {
        script.addEventListener('load', initGoogle);
        return () => script.removeEventListener('load', initGoogle);
      }
    }
  }, [GOOGLE_CLIENT_ID]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [registerErrors, setRegisterErrors] = useState({});
  const [hasAttemptedRegisterSubmit, setHasAttemptedRegisterSubmit] =
    useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isPasswordRequirementsVisible, setIsPasswordRequirementsVisible] =
    useState(false);
  const [isRegisterPasswordVisible, setIsRegisterPasswordVisible] =
    useState(false);
  const [
    isRegisterConfirmPasswordVisible,
    setIsRegisterConfirmPasswordVisible,
  ] = useState(false);
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState('');
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  const [loginEmailSuggestion, setLoginEmailSuggestion] = useState('');
  const [showLoginEmailSuggestion, setShowLoginEmailSuggestion] =
    useState(false);

  // Tính toán email suggestion khi user gõ
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setRegisterForm((prev) => ({ ...prev, email: val }));
    setRegisterErrors((prev) => ({ ...prev, email: '' }));
    // Chỉ gợi ý khi không có @ và có ký tự
    if (val && !val.includes('@')) {
      setEmailSuggestion(val + '@gmail.com');
      setShowEmailSuggestion(true);
    } else {
      setEmailSuggestion('');
      setShowEmailSuggestion(false);
    }
  };

  // Khi blur: tự động fill @gmail.com nếu chưa có @
  const handleEmailBlur = () => {
    const val = registerForm.email.trim();
    if (val && !val.includes('@')) {
      const filled = val + '@gmail.com';
      setRegisterForm((prev) => ({ ...prev, email: filled }));
      setRegisterErrors((prev) => ({ ...prev, email: '' }));
    }
    setShowEmailSuggestion(false);
    handleBlur('email');
  };

  // Áp dụng suggestion khi user chọn
  const applyEmailSuggestion = () => {
    if (emailSuggestion) {
      setRegisterForm((prev) => ({ ...prev, email: emailSuggestion }));
      setRegisterErrors((prev) => ({ ...prev, email: '' }));
      setShowEmailSuggestion(false);
      setEmailSuggestion('');
    }
  };

  // Tính toán email suggestion khi user gõ ở form đăng nhập
  const handleLoginEmailChange = (e) => {
    const val = e.target.value;
    setLoginForm((prev) => ({ ...prev, email: val }));
    setLoginErrors((prev) => ({ ...prev, email: '' }));
    // Chỉ gợi ý khi không có @ và có ký tự
    if (val && !val.includes('@')) {
      setLoginEmailSuggestion(val + '@gmail.com');
      setShowLoginEmailSuggestion(true);
    } else {
      setLoginEmailSuggestion('');
      setShowLoginEmailSuggestion(false);
    }
  };

  // Khi blur ở form đăng nhập: tự động fill @gmail.com nếu chưa có @
  const handleLoginEmailBlur = () => {
    const val = loginForm.email.trim();
    if (val && !val.includes('@')) {
      const filled = val + '@gmail.com';
      setLoginForm((prev) => ({ ...prev, email: filled }));
      setLoginErrors((prev) => ({ ...prev, email: '' }));
    }
    setShowLoginEmailSuggestion(false);
  };

  // Áp dụng suggestion khi user chọn ở form đăng nhập
  const applyLoginEmailSuggestion = () => {
    if (loginEmailSuggestion) {
      setLoginForm((prev) => ({ ...prev, email: loginEmailSuggestion }));
      setLoginErrors((prev) => ({ ...prev, email: '' }));
      setShowLoginEmailSuggestion(false);
      setLoginEmailSuggestion('');
    }
  };

  const passwordChecks = useMemo(() => {
    const password = registerForm.password.trim();
    return [
      { label: 'Ít nhất 8 ký tự', ok: password.length >= 8 },
      { label: 'Có chữ hoa', ok: /[A-Z]/.test(password) },
      { label: 'Có chữ thường', ok: /[a-z]/.test(password) },
      { label: 'Có số', ok: /[0-9]/.test(password) },
      { label: 'Có ký tự đặc biệt', ok: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [registerForm.password]);

  const passwordStrengthPercent =
    (passwordChecks.filter((item) => item.ok).length / passwordChecks.length) *
    100;

  const validateLogin = (currentEmail = loginForm.email) => {
    const errs = {};
    const valStr = currentEmail || '';
    const trimmedEmail = valStr.trim();
    if (!trimmedEmail) {
      errs.email = 'Vui lòng nhập email.';
    } else if (/\s/.test(valStr)) {
      errs.email = 'Email không chứa khoảng trắng.';
    } else if (!/@/.test(valStr)) {
      errs.email = "Email phải chứa ký tự '@'.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
      errs.email = 'Email không đúng định dạng (VD: example@gmail.com).';
    }

    if (!loginForm.password) {
      errs.password = 'Vui lòng nhập mật khẩu.';
    }

    setLoginErrors(errs);
    return errs;
  };

  const validateField = (name, value, formState = registerForm) => {
    let error = '';
    const valStr = value || '';

    switch (name) {
      case 'fullName': {
        const trimmedFullName = valStr.trim();
        if (!trimmedFullName) return 'Vui lòng nhập họ và tên.';
        if (trimmedFullName.length < 2 || trimmedFullName.length > 50)
          return 'Họ và tên phải từ 2-50 ký tự.';

        const numMatch = valStr.match(/\d/);
        if (numMatch) return `Họ tên không chứa số '${numMatch[0]}'.`;

        const specialMatch = valStr.match(/[^a-zA-Z\sÀ-ỹ]/);
        if (specialMatch)
          return `Họ tên không chứa ký tự '${specialMatch[0]}'.`;
        break;
      }
      case 'username': {
        if (!valStr) return 'Vui lòng nhập tên đăng nhập.';
        if (valStr.length < 6 || valStr.length > 20)
          return 'Tên đăng nhập phải từ 6-20 ký tự.';
        if (/\s/.test(valStr)) return 'Tên đăng nhập không có khoảng trắng.';

        const viMatch = valStr.match(/[À-ỹ]/);
        if (viMatch) return 'Tên đăng nhập không chứa dấu.';

        const specialMatch = valStr.match(/[^a-zA-Z0-9_]/);
        if (specialMatch)
          return `Tên đăng nhập không chứa ký tự '${specialMatch[0]}'.`;
        break;
      }
      case 'phoneNumber': {
        if (!valStr) return 'Vui lòng nhập số điện thoại.';
        if (/\s/.test(valStr)) return 'Số điện thoại không có khoảng trắng.';

        const letterMatch = valStr.match(/[a-zA-ZÀ-ỹ]/);
        if (letterMatch) return `Số ĐT không chứa chữ cái '${letterMatch[0]}'.`;

        const specialMatch = valStr.match(/[^0-9a-zA-ZÀ-ỹ]/);
        if (specialMatch) return `Số ĐT không chứa ký tự '${specialMatch[0]}'.`;

        if (valStr.length !== 10) return 'Số ĐT phải gồm đúng 10 chữ số.';
        if (!/^(03|05|07|08|09)/.test(valStr))
          return 'Số ĐT bắt đầu bằng 03,05,07,08,09.';
        break;
      }
      case 'email': {
        const trimmedEmail = valStr.trim();
        if (!trimmedEmail) return 'Vui lòng nhập email.';
        if (/\s/.test(valStr)) return 'Email không chứa khoảng trắng.';
        if (!/@/.test(valStr)) return "Email phải chứa ký tự '@'.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr))
          return 'Email không đúng định dạng (VD: example@gmail.com).';
        break;
      }
      case 'password': {
        const p = valStr.trim();
        if (!p) return 'Vui lòng nhập mật khẩu.';
        if (p.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
        if (!/[A-Z]/.test(p)) return 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
        if (!/[a-z]/.test(p)) return 'Mật khẩu phải chứa ít nhất 1 chữ thường.';
        if (!/[0-9]/.test(p)) return 'Mật khẩu phải chứa ít nhất 1 chữ số.';
        if (!/[^A-Za-z0-9]/.test(p))
          return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
        break;
      }
      case 'confirmPassword': {
        if (!valStr.trim()) return 'Vui lòng nhập lại mật khẩu.';
        if (valStr.trim() !== (formState.password || '').trim())
          return 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập.';
        break;
      }
      case 'dob': {
        if (!valStr) return 'Vui lòng chọn ngày sinh.';
        const parts = valStr.split('/');
        if (parts.length === 3) {
          const selectedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (selectedDate > new Date())
            return 'Ngày sinh không thể ở tương lai.';
        } else {
          return 'Ngày sinh không hợp lệ.';
        }
        break;
      }
      default:
        break;
    }
    return error;
  };

  const validateRegister = (
    showTermsError = hasAttemptedRegisterSubmit,
    currentEmail = registerForm.email
  ) => {
    const errs = {};
    const fields = [
      'fullName',
      'username',
      'phoneNumber',
      'email',
      'password',
      'confirmPassword',
    ];
    fields.forEach((field) => {
      const val = field === 'email' ? currentEmail : registerForm[field];
      const error = validateField(field, val, registerForm);
      if (error) errs[field] = error;
    });

    const dobError = validateField('dob', dob, registerForm);
    if (dobError) errs.dob = dobError;

    if (showTermsError && !hasAcceptedTerms) {
      errs.terms =
        'Vui lòng đồng ý với Chính sách bảo mật và Điều khoản dịch vụ.';
    }
    setRegisterErrors(errs);
    return errs;
  };

  const handleBlur = (field) => {
    const value = field === 'dob' ? dob : registerForm[field];
    const error = validateField(field, value, registerForm);
    setRegisterErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleLoginBlur = (field) => {
    const errs = validateLogin();
    setLoginErrors((prev) => ({ ...prev, [field]: errs[field] || '' }));
  };

  const ErrorMsg = ({ msg }) =>
    msg ? (
      <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
        <span className="material-symbols-outlined text-[13px] shrink-0">
          error
        </span>
        {msg}
      </span>
    ) : null;

  const handleAuthSuccess = useCallback(async () => {
    const user = useAuthStore.getState().user;
    let isAdmin = false;
    let isStaff = false;
    const userName = user?.fullName || user?.username || 'bạn';

    if (user) {
      if (typeof user.role === 'string') {
        if (user.role.toUpperCase().includes('ADMIN')) isAdmin = true;
        if (user.role.toUpperCase().includes('STAFF')) isStaff = true;
      } else if (Array.isArray(user.roles)) {
        user.roles.forEach((roleItem) => {
          let roleStr = '';
          if (typeof roleItem === 'string') roleStr = roleItem.toUpperCase();
          else if (typeof roleItem === 'object' && roleItem !== null)
            roleStr = String(Object.values(roleItem).join(' ')).toUpperCase();

          if (roleStr.includes('ADMIN')) isAdmin = true;
          if (roleStr.includes('STAFF')) isStaff = true;
        });
      } else if (Array.isArray(user.authorities)) {
        user.authorities.forEach((auth) => {
          if (typeof auth.authority === 'string') {
            const roleStr = auth.authority.toUpperCase();
            if (roleStr.includes('ADMIN')) isAdmin = true;
            if (roleStr.includes('STAFF')) isStaff = true;
          }
        });
      }
    }

    if (isAdmin) {
      showToast(
        `Đăng nhập thành công! Chào mừng Quản trị viên ${userName} quay trở lại.`,
        'success'
      );
      navigate('/admin');
    } else if (isStaff) {
      showToast(
        `Đăng nhập thành công! Chào mừng Nhân viên ${userName} bắt đầu ca làm việc.`,
        'success'
      );
      navigate('/staff');
    } else {
      showToast(
        `Đăng nhập thành công! Chào mừng ${userName} đến với GinFilm.`,
        'success'
      );
      // Kiểm tra xem user đã có PIN chưa — nếu chưa thì báo HomePage hiện modal setup PIN
      try {
        const { apiGet } = await import('../../../../shared/api/client');
        const res = await apiGet('/users/pin/status');
        if (res.hasPinSetup === false) {
          navigate('/home', { state: { requirePinSetup: true } });
          return;
        }
      } catch {
        // Nếu lỗi API, không bắt setup PIN
      }
      navigate('/home');
    }
  }, [navigate, showToast]);

  const handleGuestEntry = useCallback(() => {
    clearSession();
    navigate('/home');
  }, [clearSession, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    let emailVal = loginForm.email.trim();
    if (emailVal && !emailVal.includes('@')) {
      emailVal = emailVal + '@gmail.com';
      setLoginForm((prev) => ({ ...prev, email: emailVal }));
    }

    const errs = validateLogin(emailVal);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await login({ email: emailVal, password: loginForm.password });
      handleAuthSuccess('Đăng nhập thành công.', 'Chào mừng bạn quay trở lại!');
    } catch (err) {
      const rawMsg = normalizeMessage(extractErrorMessage(err));
      const isUnverified =
        rawMsg.includes('xác thực tài khoản') ||
        rawMsg.includes('chưa xác thực') ||
        rawMsg.includes('unverified') ||
        rawMsg.includes('not verified') ||
        rawMsg.includes('account is not active') ||
        rawMsg.includes('vui lòng xác thực');

      const isLocked =
        err?.response?.status === 423 ||
        err?.response?.data?.locked ||
        rawMsg.includes('khóa tạm thời');

      if (isUnverified) {
        setUnverifiedEmail(emailVal);
        setShowUnverifiedModal(true);
      } else if (isLocked) {
        setPendingEmail(emailVal);
        setOtpAction('unlock');
        setOtpValue(['', '', '', '', '', '']);
        setOtpError('');
        setShowOtpModal(true);
        startResendCooldown(60);
        showToast(
          'Tài khoản đã bị khóa. Vui lòng kiểm tra email để lấy OTP mở khóa.',
          'error'
        );
      } else {
        setLoginErrors((prev) => ({
          ...prev,
          general: mapLoginErrorMessage(err),
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bắt đầu đếm ngược cooldown gửi lại OTP ──
  const startResendCooldown = useCallback((seconds) => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setResendCooldown(seconds);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Chuyển từ modal unverified sang OTP flow ──
  const handleGoToVerify = useCallback(async () => {
    setShowUnverifiedModal(false);
    setPendingEmail(unverifiedEmail);
    setOtpAction('verify');
    setOtpValue(['', '', '', '', '', '']);
    setOtpError('');
    setResendCooldown(0);
    // Gửi lại OTP tự động
    try {
      await resendVerification(unverifiedEmail);
      startResendCooldown(60);
      showToast(
        'Đã gửi mã OTP về email. Vui lòng kiểm tra hộp thư của bạn.',
        'success'
      );
    } catch {
      showToast(
        'Không thể gửi lại OTP lúc này. Vui lòng thử lại sau.',
        'error'
      );
    }
    setShowOtpModal(true);
  }, [unverifiedEmail, showToast, startResendCooldown]);

  // ── switchTab ──
  const switchTab = useCallback(
    (tab) => {
      if (tab === activeTab) return;
      setFormOpacity('opacity-0');
      setLoginErrors({});
      setRegisterErrors({});
      setTimeout(() => {
        setVisibleForm(tab);
        setActiveTab(tab);
        navigate(tab === 'login' ? '/login' : '/register', { replace: true });
        setTimeout(() => setFormOpacity('opacity-100'), 50);
      }, 300);
    },
    [activeTab, navigate]
  );

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setHasAttemptedRegisterSubmit(true);

    let emailVal = registerForm.email.trim();
    if (emailVal && !emailVal.includes('@')) {
      emailVal = emailVal + '@gmail.com';
      setRegisterForm((prev) => ({ ...prev, email: emailVal }));
    }

    const nextErrors = validateRegister(true, emailVal);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.general) {
        showToast(nextErrors.general, 'error');
      }
      return;
    }

    const { fullName, username, password, confirmPassword, phoneNumber } =
      registerForm;

    setSubmitting(true);
    try {
      await register({
        fullName,
        username,
        email: emailVal,
        password: password.trim(),
        confirmPassword: confirmPassword.trim(),
        dateOfBirth: dobToIso(dob),
        phoneNumber,
      });
      // Đăng ký thành công → mở modal OTP, không chuyển trang
      setPendingEmail(emailVal);
      setOtpAction('verify');
      setOtpValue(['', '', '', '', '', '']);
      setOtpError('');
      setShowOtpModal(true);
      startResendCooldown(60);
      showToast(
        'Đăng ký thành công! Vui lòng kiểm tra email để nhập mã OTP.',
        'success'
      );
    } catch (err) {
      const mappedError = mapRegisterError(err);
      setRegisterErrors(mappedError.fieldErrors);
      showToast(mappedError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpInput = useCallback((index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpValue((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setOtpError('');
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }, []);

  // ── Xử lý phím xoá trong ô OTP ──
  const handleOtpKeyDown = useCallback(
    (index, e) => {
      if (e.key === 'Backspace') {
        if (otpValue[index]) {
          setOtpValue((prev) => {
            const n = [...prev];
            n[index] = '';
            return n;
          });
        } else if (index > 0) {
          otpInputRefs.current[index - 1]?.focus();
          setOtpValue((prev) => {
            const n = [...prev];
            n[index - 1] = '';
            return n;
          });
        }
      }
    },
    [otpValue]
  );

  // ── Xử lý paste OTP ──
  const handleOtpPaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (!pasted) return;
    setOtpValue((prev) => {
      const next = [...prev];
      for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
      return next;
    });
    setOtpError('');
    const focusIdx = Math.min(pasted.length, 5);
    setTimeout(() => otpInputRefs.current[focusIdx]?.focus(), 0);
  }, []);

  // ── Submit xác thực OTP ──
  const handleOtpSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const code = otpValue.join('');
      if (code.length < 6) {
        setOtpError('Vui lòng nhập đủ 6 chữ số mã OTP.');
        return;
      }
      setOtpSubmitting(true);
      setOtpError('');
      try {
        if (otpAction === 'unlock') {
          await unlockAccount(pendingEmail, code);
          setShowOtpModal(false);
          showToast(
            'Mở khóa tài khoản thành công! Bạn có thể đăng nhập lại.',
            'success'
          );
          setLoginForm((prev) => ({ ...prev, password: '' }));
        } else {
          await verifyAccount(pendingEmail, code);
          setShowOtpModal(false);
          showToast(
            'Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.',
            'success'
          );
          switchTab('login');
          navigate('/login', { replace: true });
        }
      } catch (err) {
        const msg = extractErrorMessage(err);
        setOtpError(
          msg || 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.'
        );
      } finally {
        setOtpSubmitting(false);
      }
    },
    [otpValue, pendingEmail, navigate, showToast, switchTab, otpAction]
  );

  // ── Gửi lại OTP ──
  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setOtpError('');
    try {
      if (otpAction === 'unlock') {
        await resendUnlockOtp(pendingEmail);
      } else {
        await resendVerification(pendingEmail);
      }
      showToast('Đã gửi lại mã OTP. Vui lòng kiểm tra email.', 'success');
      startResendCooldown(60);
      setOtpValue(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = extractErrorMessage(err);
      showToast(msg || 'Không thể gửi lại OTP. Vui lòng thử lại sau.', 'error');
    } finally {
      setResendLoading(false);
    }
  }, [
    resendCooldown,
    resendLoading,
    pendingEmail,
    showToast,
    startResendCooldown,
    otpAction,
  ]);

  const tabActiveClass =
    'flex-1 rounded-full border border-red-500/40 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600/30 dark:to-red-700/20 px-5 py-3 text-center text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_8px_20px_rgba(239,68,68,0.3)] dark:shadow-[0_10px_30px_rgba(127,29,29,0.3)] backdrop-blur-md transition-all duration-300';
  const tabInactiveClass =
    'flex-1 rounded-full border border-transparent px-5 py-3 text-center text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white/85';

  return (
    <div className="auth-page relative min-h-screen overflow-x-hidden bg-white dark:bg-black text-gray-900 dark:text-white antialiased">
      {/* ══════════════════ Unverified Account Modal ══════════════════ */}
      {showUnverifiedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowUnverifiedModal(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0e0b0b]/97 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-[fadeInScale_0.25s_ease-out]">
            {/* Close button */}
            <button
              type="button"
              aria-label="Đóng"
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-[#111827] dark:text-white"
              onClick={() => setShowUnverifiedModal(false)}
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>

            {/* Warning Icon */}
            <div className="mb-5 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500/25 to-red-700/15 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                <span className="material-symbols-outlined text-[42px] text-red-400">
                  shield_lock
                </span>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold tracking-wide text-[#111827] dark:text-white">
                Tài khoản chưa được xác thực
              </h2>
              <p className="mt-3 text-sm text-white/55 leading-relaxed">
                Tài khoản này hiện chưa được xác thực, xin quý khách vui lòng
                xác thực lại tài khoản trước khi đăng nhập.
              </p>
              {unverifiedEmail && (
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-red-300">
                    {unverifiedEmail}
                  </span>
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="mb-5 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

            {/* CTA Button */}
            <button
              type="button"
              id="btn-go-to-verify"
              className="w-full rounded-2xl border border-red-500/30 bg-[linear-gradient(135deg,rgba(220,38,38,0.9),rgba(153,27,27,0.9))] py-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#111827] dark:text-white shadow-[0_16px_40px_rgba(220,38,38,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(220,38,38,0.3)]"
              onClick={handleGoToVerify}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  mark_email_read
                </span>
                Xác thực tài khoản ngay
              </span>
            </button>

            {/* Cancel link */}
            <p className="mt-4 text-center text-sm text-white/35">
              <button
                type="button"
                className="underline decoration-white/20 transition-colors hover:text-gray-500 dark:text-gray-400"
                onClick={() => setShowUnverifiedModal(false)}
              >
                Để sau
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════ OTP Verification Modal ══════════════════ */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowOtpModal(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0e0b0b]/95 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            {/* Close button */}
            <button
              type="button"
              aria-label="Đóng"
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-[#111827] dark:text-white"
              onClick={() => setShowOtpModal(false)}
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>

            {/* Icon */}
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600/30 to-red-800/20 border border-red-500/30">
                <span className="material-symbols-outlined text-[36px] text-red-400">
                  mark_email_read
                </span>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold tracking-wide text-white">
                {otpAction === 'unlock'
                  ? 'Mở khóa tài khoản'
                  : 'Xác thực Email'}
              </h2>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">
                Chúng tôi đã gửi mã OTP 6 chữ số đến
                <br />
                <span className="font-semibold text-red-300">
                  {pendingEmail}
                </span>
              </p>
            </div>

            {/* OTP Form */}
            <form noValidate onSubmit={handleOtpSubmit}>
              {/* 6 input boxes */}
              <div
                className="mb-4 flex justify-center gap-3"
                onPaste={handleOtpPaste}
              >
                {otpValue.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoComplete="one-time-code"
                    className={`h-14 w-12 rounded-2xl border text-center text-xl font-bold text-white bg-black/50 backdrop-blur-xl outline-none transition-all duration-200 caret-transparent
                      ${
                        otpError
                          ? 'border-red-500 ring-1 ring-red-500/50'
                          : digit
                            ? 'border-red-500/70 ring-1 ring-red-500/30 shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                            : 'border-white/15 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30'
                      }`}
                    onChange={(e) => handleOtpInput(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>

              {/* Error message */}
              {otpError && (
                <p className="mb-4 flex items-center justify-center gap-1.5 text-sm font-medium text-red-400">
                  <span className="material-symbols-outlined text-[15px]">
                    error
                  </span>
                  {otpError}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={otpSubmitting || otpValue.join('').length < 6}
                className="w-full rounded-2xl border border-red-500/30 bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] py-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#111827] dark:text-white shadow-[0_16px_40px_rgba(127,29,29,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(127,29,29,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
              >
                {otpSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Đang xác thực...
                  </span>
                ) : (
                  'Xác thực tài khoản'
                )}
              </button>
            </form>

            {/* Resend section */}
            <div className="mt-5 text-center">
              <p className="text-sm text-white/40">
                Không nhận được mã?{' '}
                {resendCooldown > 0 ? (
                  <span className="font-medium text-gray-300 dark:text-gray-600">
                    Gửi lại sau{' '}
                    <span className="tabular-nums text-red-400">
                      {resendCooldown}s
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={resendLoading}
                    className="font-semibold text-red-400 underline decoration-red-500/30 transition-colors hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleResendOtp}
                  >
                    {resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
                  </button>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Image Background - full screen */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://res.cloudinary.com/df3fzqvrd/image/upload/v1785438443/fXsWS_gf0qwx.jpg"
          alt="Auth Background"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-white/30 dark:bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 dark:from-black/85 via-white/30 dark:via-black/50 to-transparent" />
      </div>

      {/* Logo - top left */}
      <div
        className="fixed left-10 top-10 z-30 flex cursor-pointer items-center gap-5 select-none outline-none focus:outline-none"
        role="button"
        tabIndex={0}
        title="Vào trang chủ với tư cách khách"
        onClick={handleGuestEntry}
        onKeyDown={(e) => e.key === 'Enter' && handleGuestEntry()}
      >
        <img
          alt="GinFilm"
          className="h-16 w-auto shrink-0 object-contain pointer-events-none"
          draggable="false"
          src={LOGO_URL}
        />
        <div className="flex items-center leading-none pointer-events-none select-none">
          <span className="text-[2rem] font-black tracking-[0.12em] text-gray-900 dark:text-white">
            GIN
          </span>
          <span className="text-[2rem] font-black tracking-[0.12em] text-[#dc2626]">
            FILM
          </span>
        </div>
      </div>

      {/* Tagline - bottom left */}
      <div className="fixed bottom-16 left-14 z-20 max-w-[540px]">
        <p className="max-w-[520px] text-[42px] font-semibold leading-[1.12] tracking-[-0.01em] text-gray-800 dark:text-gray-200 text-balance">
          <span className="font-semibold text-gray-900 dark:text-white">
            Gin<span className="text-red-500">Film</span>, chạm màn ảnh lớn,
            sống trọn từng cảm xúc.
          </span>
        </p>
        <p className="mt-5 max-w-[420px] text-base font-medium leading-7 text-gray-600 dark:text-gray-400 text-balance">
          Đăng nhập để đặt vé nhanh hơn và tận hưởng trọn vẹn hành trình điện
          ảnh cùng GinFilm.
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="relative z-20 flex w-full flex-col justify-center px-6 py-6 md:px-8 lg:px-14 xl:px-24 min-h-screen text-gray-900 dark:text-white">
        <div className="ml-auto w-full max-w-2xl rounded-3xl border border-white/60 dark:border-white/20 bg-white/80 dark:bg-black/40 backdrop-blur-2xl p-6 shadow-[0_16px_60px_rgba(0,0,0,0.05)] dark:shadow-2xl">
          {/* Tabs */}
          <div className="mb-5 flex rounded-full border border-gray-200 dark:border-red-500/20 bg-white/40 dark:bg-black/30 p-1 backdrop-blur-xl">
            <button
              type="button"
              className={
                activeTab === 'login' ? tabActiveClass : tabInactiveClass
              }
              onClick={() => switchTab('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={
                activeTab === 'register' ? tabActiveClass : tabInactiveClass
              }
              onClick={() => switchTab('register')}
            >
              Đăng ký
            </button>
          </div>

          {/* Registration Form */}
          {visibleForm === 'register' && (
            <form
              noValidate
              className={`space-y-4 transition-opacity duration-300 ${formOpacity}`}
              onSubmit={handleRegisterSubmit}
              autoComplete="off"
            >
              {registerErrors.general && (
                <div className="rounded-2xl border border-red-400 dark:border-red-500/30 bg-red-100 dark:bg-red-500/20 px-4 py-3 text-sm font-bold text-red-800 dark:text-red-300 shadow-sm">
                  {registerErrors.general}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 font-medium">
                <div className="space-y-1.5">
                  <label className={GLASS_LABEL_CLASS}>
                    HỌ VÀ TÊN <span className="text-red-500">*</span>
                  </label>
                  <div className="group relative">
                    <User
                      className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
                      size={17}
                    />
                    <input
                      className={`${GLASS_INPUT_CLASS} pl-11 ${registerErrors.fullName ? '!border-red-500' : ''}`}
                      placeholder="Nhập họ và tên"
                      value={registerForm.fullName}
                      autoComplete="off"
                      onBlur={() => handleBlur('fullName')}
                      onChange={(e) => {
                        setRegisterForm((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }));
                        setRegisterErrors((prev) => ({
                          ...prev,
                          fullName: '',
                        }));
                      }}
                    />
                  </div>
                  <ErrorMsg msg={registerErrors.fullName} />
                </div>

                <div className="space-y-1.5">
                  <label className={GLASS_LABEL_CLASS}>
                    TÊN ĐĂNG NHẬP <span className="text-red-500">*</span>
                  </label>
                  <div className="group relative">
                    <IdCard
                      className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
                      size={17}
                    />
                    <input
                      className={`${GLASS_INPUT_CLASS} pl-11 ${registerErrors.username ? '!border-red-500' : ''}`}
                      placeholder="Nhập tên đăng nhập"
                      value={registerForm.username}
                      autoComplete="username"
                      onBlur={() => handleBlur('username')}
                      onChange={(e) => {
                        setRegisterForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }));
                        setRegisterErrors((prev) => ({
                          ...prev,
                          username: '',
                        }));
                      }}
                    />
                  </div>
                  <ErrorMsg msg={registerErrors.username} />
                </div>

                <div className="space-y-1.5">
                  <label className={GLASS_LABEL_CLASS}>
                    SỐ ĐIỆN THOẠI <span className="text-red-500">*</span>
                  </label>
                  <div className="group relative">
                    <Phone
                      className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
                      size={17}
                    />
                    <input
                      className={`${GLASS_INPUT_CLASS} pl-11 ${registerErrors.phoneNumber ? '!border-red-500' : ''}`}
                      placeholder="Nhập số điện thoại"
                      type="tel"
                      value={registerForm.phoneNumber}
                      autoComplete="off"
                      onBlur={() => handleBlur('phoneNumber')}
                      onChange={(e) => {
                        setRegisterForm((prev) => ({
                          ...prev,
                          phoneNumber: e.target.value,
                        }));
                        setRegisterErrors((prev) => ({
                          ...prev,
                          phoneNumber: '',
                        }));
                      }}
                    />
                  </div>
                  <ErrorMsg msg={registerErrors.phoneNumber} />
                </div>

                <div className="space-y-1.5">
                  <label className={GLASS_LABEL_CLASS}>
                    NGÀY SINH <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={dob}
                    onChange={(v) => {
                      setDob(v);
                      setRegisterErrors((prev) => ({ ...prev, dob: '' }));
                    }}
                  />
                  <ErrorMsg msg={registerErrors.dob} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className={GLASS_LABEL_CLASS}>
                    EMAIL <span className="text-red-500">*</span>
                  </label>
                  <div className="group relative">
                    <Mail
                      className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
                      size={17}
                    />
                    <input
                      className={`${GLASS_INPUT_CLASS} pl-11 ${registerErrors.email ? '!border-red-500' : ''}`}
                      placeholder="example@gmail.com"
                      type="text"
                      value={registerForm.email}
                      autoComplete="off"
                      onBlur={handleEmailBlur}
                      onChange={handleEmailChange}
                      onKeyDown={(e) => {
                        // Nhấn Tab hoặc Enter khi đang có suggestion → áp dụng
                        if (
                          (e.key === 'Tab' || e.key === 'Enter') &&
                          showEmailSuggestion
                        ) {
                          e.preventDefault();
                          applyEmailSuggestion();
                        }
                        if (e.key === 'Escape') {
                          setShowEmailSuggestion(false);
                        }
                      }}
                    />
                    {/* Email suggestion dropdown */}
                    {showEmailSuggestion && emailSuggestion && (
                      <div
                        className="absolute left-0 top-[calc(100%+6px)] z-50 w-full cursor-pointer overflow-hidden rounded-2xl border border-[#d77567]/40 bg-[#1a1010]/95 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={applyEmailSuggestion}
                      >
                        <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#d77567]/15">
                          <Mail size={15} className="shrink-0 text-[#d77567]" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-white/50">
                              Ý bạn là:
                            </span>
                            <span className="block truncate text-[14px] font-semibold text-[#111827] dark:text-white">
                              <span className="text-white/70">
                                {registerForm.email}
                              </span>
                              <span className="text-[#d77567]">@gmail.com</span>
                            </span>
                          </div>
                          <span className="shrink-0 rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            Tab
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <ErrorMsg msg={registerErrors.email} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className={GLASS_LABEL_CLASS}>
                    MẬT KHẨU <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="group relative">
                      <Lock
                        className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
                        size={17}
                      />
                      <input
                        className={`${GLASS_INPUT_CLASS} pl-11 pr-11 ${registerErrors.password ? '!border-red-500' : ''}`}
                        placeholder="Nhập mật khẩu"
                        type={isRegisterPasswordVisible ? 'text' : 'password'}
                        value={registerForm.password}
                        autoComplete="new-password"
                        onFocus={() => setIsPasswordRequirementsVisible(true)}
                        onBlur={() => {
                          setIsPasswordRequirementsVisible(false);
                          handleBlur('password');
                        }}
                        onChange={(e) => {
                          setRegisterForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }));
                          setRegisterErrors((prev) => ({
                            ...prev,
                            password: '',
                          }));
                        }}
                      />
                      <button
                        type="button"
                        aria-label={
                          isRegisterPasswordVisible
                            ? 'Ẩn mật khẩu'
                            : 'Hiện mật khẩu'
                        }
                        className="absolute right-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f7d7d] transition-colors duration-200 hover:text-[#111827] dark:text-white"
                        onClick={() =>
                          setIsRegisterPasswordVisible((prev) => !prev)
                        }
                      >
                        {isRegisterPasswordVisible ? (
                          <Eye
                            size={17}
                            className="transition-all duration-200 opacity-80"
                          />
                        ) : (
                          <EyeOff
                            size={17}
                            className="transition-all duration-200 opacity-60"
                          />
                        )}
                      </button>
                      {registerForm.password.trim() &&
                        registerForm.confirmPassword.trim() &&
                        registerForm.password.trim() ===
                          registerForm.confirmPassword.trim() && (
                          <div className="absolute right-12 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-emerald-400 animate-in fade-in zoom-in duration-300">
                            <Check size={18} strokeWidth={3} />
                          </div>
                        )}
                    </div>
                  </div>
                  <ErrorMsg msg={registerErrors.password} />

                  {isPasswordRequirementsVisible && (
                    <div className="mt-2 rounded-lg border border-[#433737] bg-[#241f1f] px-4 py-3">
                      <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordStrengthPercent === 100
                              ? 'bg-emerald-400'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${passwordStrengthPercent}%` }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        {passwordChecks.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-2 text-[13px]"
                          >
                            <span
                              className={
                                item.ok ? 'text-emerald-400' : 'text-white/25'
                              }
                            >
                              ✓
                            </span>
                            <span
                              className={
                                item.ok ? 'text-white/80' : 'text-white/45'
                              }
                            >
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className={GLASS_LABEL_CLASS}>
                    XÁC NHẬN MẬT KHẨU <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="group relative">
                      <Lock
                        className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
                        size={17}
                      />
                      <input
                        className={`${GLASS_INPUT_CLASS} pl-11 pr-11 ${registerErrors.confirmPassword ? '!border-red-500' : ''}`}
                        placeholder="Nhập lại mật khẩu"
                        type={
                          isRegisterConfirmPasswordVisible ? 'text' : 'password'
                        }
                        value={registerForm.confirmPassword}
                        autoComplete="new-password"
                        onBlur={() => handleBlur('confirmPassword')}
                        onChange={(e) => {
                          setRegisterForm((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }));
                          setRegisterErrors((prev) => ({
                            ...prev,
                            confirmPassword: '',
                          }));
                        }}
                      />
                      <button
                        type="button"
                        aria-label={
                          isRegisterConfirmPasswordVisible
                            ? 'Ẩn mật khẩu xác nhận'
                            : 'Hiện mật khẩu xác nhận'
                        }
                        className="absolute right-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f7d7d] transition-colors duration-200 hover:text-[#111827] dark:text-white"
                        onClick={() =>
                          setIsRegisterConfirmPasswordVisible((prev) => !prev)
                        }
                      >
                        {isRegisterConfirmPasswordVisible ? (
                          <Eye
                            size={17}
                            className="transition-all duration-200 opacity-80"
                          />
                        ) : (
                          <EyeOff
                            size={17}
                            className="transition-all duration-200 opacity-60"
                          />
                        )}
                      </button>
                      {registerForm.password.trim() &&
                        registerForm.confirmPassword.trim() &&
                        registerForm.password.trim() ===
                          registerForm.confirmPassword.trim() && (
                          <div className="absolute right-12 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-emerald-400 animate-in fade-in zoom-in duration-300">
                            <Check size={18} strokeWidth={3} />
                          </div>
                        )}
                    </div>
                  </div>
                  <ErrorMsg msg={registerErrors.confirmPassword} />
                </div>
              </div>

              <div className="group">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 items-center">
                    <input
                      checked={hasAcceptedTerms}
                      className={`h-4 w-4 appearance-auto cursor-pointer accent-red-600 transition-all ${registerErrors.terms ? 'outline outline-2 outline-red-500' : ''}`}
                      id="terms"
                      type="checkbox"
                      onChange={(e) => {
                        setHasAcceptedTerms(e.target.checked);
                        setRegisterErrors((prev) => ({ ...prev, terms: '' }));
                      }}
                    />
                  </div>
                  <label
                    className="cursor-pointer select-none text-sm leading-relaxed text-gray-700 dark:text-gray-500"
                    htmlFor="terms"
                  >
                    Tôi đồng ý với{' '}
                    <Link
                      className="font-medium text-red-500 dark:text-red-300 underline decoration-red-500/30 transition-colors hover:text-red-600 dark:hover:text-white hover:decoration-red-400"
                      to="/info?tab=privacy"
                    >
                      Chính sách bảo mật
                    </Link>{' '}
                    và{' '}
                    <Link
                      className="font-medium text-red-500 dark:text-red-300 underline decoration-red-500/30 transition-colors hover:text-red-600 dark:hover:text-white hover:decoration-red-400"
                      to="/info?tab=terms"
                    >
                      Điều khoản dịch vụ
                    </Link>{' '}
                    của GinFilm.
                  </label>
                </div>
                <ErrorMsg msg={registerErrors.terms} />
              </div>

              <button
                className="w-full rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500 to-red-600 dark:from-[rgba(220,38,38,0.95)] dark:to-[rgba(127,29,29,0.95)] py-4 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(239,68,68,0.25)] dark:shadow-[0_16px_40px_rgba(127,29,29,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(239,68,68,0.35)] dark:hover:shadow-[0_24px_48px_rgba(127,29,29,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Đăng ký'}
              </button>
              <div className="flex justify-center">
                <button
                  type="button"
                  className="text-sm font-bold text-gray-900 dark:text-gray-500 transition-colors underline decoration-gray-500 dark:decoration-white/15 hover:text-red-600 dark:hover:text-white/80 hover:decoration-red-600 dark:hover:decoration-white/40"
                  onClick={handleGuestEntry}
                >
                  Tiếp tục với tư cách khách
                </button>
              </div>
            </form>
          )}

          {/* Login Form */}
          {visibleForm === 'login' && (
            <form
              noValidate
              className={`space-y-4 transition-opacity duration-300 ${formOpacity}`}
              onSubmit={handleLoginSubmit}
              autoComplete="off"
            >
              {loginErrors.general && (
                <div className="rounded-2xl border border-red-400 dark:border-red-500/30 bg-red-100 dark:bg-red-500/20 px-4 py-3 text-sm font-bold text-red-800 dark:text-red-300 shadow-sm">
                  {loginErrors.general}
                </div>
              )}
              <div className="space-y-4 font-medium">
                <div className="space-y-1">
                  <label className={GLASS_LABEL_CLASS}>
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="group relative">
                    <span
                      className={`material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-[#d77567]`}
                    >
                      mail
                    </span>
                    <input
                      className={`${GLASS_INPUT_CLASS} pl-11 ${loginErrors.email ? '!border-red-500' : ''}`}
                      placeholder="Email"
                      type="text"
                      value={loginForm.email}
                      autoComplete="off"
                      onBlur={() => {
                        handleLoginEmailBlur();
                        handleLoginBlur('email');
                      }}
                      onChange={handleLoginEmailChange}
                      onKeyDown={(e) => {
                        if (
                          (e.key === 'Tab' || e.key === 'Enter') &&
                          showLoginEmailSuggestion
                        ) {
                          e.preventDefault();
                          applyLoginEmailSuggestion();
                        }
                        if (e.key === 'Escape') {
                          setShowLoginEmailSuggestion(false);
                        }
                      }}
                    />
                    {/* Email suggestion dropdown */}
                    {showLoginEmailSuggestion && loginEmailSuggestion && (
                      <div
                        className="absolute left-0 top-[calc(100%+6px)] z-50 w-full cursor-pointer overflow-hidden rounded-2xl border border-[#d77567]/40 bg-[#1a1010]/95 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={applyLoginEmailSuggestion}
                      >
                        <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#d77567]/15">
                          <span className="material-symbols-outlined text-[15px] shrink-0 text-[#d77567]">
                            mail
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-white/50">
                              Ý bạn là:
                            </span>
                            <span className="block truncate text-[14px] font-semibold text-[#111827] dark:text-white">
                              <span className="text-white/70">
                                {loginForm.email}
                              </span>
                              <span className="text-[#d77567]">@gmail.com</span>
                            </span>
                          </div>
                          <span className="shrink-0 rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            Tab
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <ErrorMsg msg={loginErrors.email} />
                </div>

                <div className="space-y-1.5">
                  <label className={GLASS_LABEL_CLASS}>
                    Mật khẩu <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span
                      className={`material-symbols-outlined input-field-icon ${GLASS_ICON_CLASS}`}
                    >
                      lock
                    </span>
                    <input
                      className={`${GLASS_INPUT_CLASS} input-has-icon pr-11 ${loginErrors.password ? '!border-red-500' : ''}`}
                      placeholder="Mật khẩu"
                      type={isLoginPasswordVisible ? 'text' : 'password'}
                      value={loginForm.password}
                      autoComplete="current-password"
                      onBlur={() => handleLoginBlur('password')}
                      onChange={(e) => {
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }));
                        setLoginErrors((prev) => ({ ...prev, password: '' }));
                      }}
                    />
                    <button
                      type="button"
                      aria-label={
                        isLoginPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                      }
                      className="absolute right-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f7d7d] transition-colors duration-200 hover:text-[#111827] dark:text-white"
                      onClick={() => setIsLoginPasswordVisible((prev) => !prev)}
                    >
                      {isLoginPasswordVisible ? (
                        <Eye
                          size={17}
                          className="transition-all duration-200 opacity-80"
                        />
                      ) : (
                        <EyeOff
                          size={17}
                          className="transition-all duration-200 opacity-60"
                        />
                      )}
                    </button>
                  </div>
                  <ErrorMsg msg={loginErrors.password} />
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      className="text-sm font-bold text-gray-900 dark:text-gray-400 transition-colors hover:text-red-600 dark:hover:text-red-300 cursor-pointer"
                      onClick={() => navigate('/login/forgot-password')}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>
              </div>

              <button
                className="w-full rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500 to-red-600 dark:from-[rgba(220,38,38,0.95)] dark:to-[rgba(127,29,29,0.95)] py-4 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(239,68,68,0.25)] dark:shadow-[0_16px_40px_rgba(127,29,29,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(239,68,68,0.35)] dark:hover:shadow-[0_24px_48px_rgba(127,29,29,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
              <div className="flex justify-center">
                <button
                  type="button"
                  className="text-sm font-bold text-gray-900 dark:text-gray-500 transition-colors underline decoration-gray-500 dark:decoration-white/15 hover:text-red-600 dark:hover:text-white/80 hover:decoration-red-600 dark:hover:decoration-white/40"
                  onClick={handleGuestEntry}
                >
                  Tiếp tục với tư cách khách
                </button>
              </div>
            </form>
          )}

          {/* Social Divider */}
          <div className="relative mt-5 flex items-center py-1.5">
            <div className="h-px flex-grow bg-gray-400 dark:bg-white/10" />
            <span className="mx-4 flex-shrink-0 text-xs font-bold uppercase tracking-[0.22em] text-gray-900 dark:text-gray-600">
              Hoặc
            </span>
            <div className="h-px flex-grow bg-gray-400 dark:bg-white/10" />
          </div>

          {/* Social Auth */}
          {/* Hidden div để GSI render button nếu One-Tap bị block */}
          <div id="google-btn-hidden" className="hidden" />
          <button
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 dark:border-white/12 bg-white dark:bg-white/7 shadow-sm py-3.5 font-medium text-gray-700 dark:text-gray-300 backdrop-blur-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            onClick={handleGoogleButtonClick}
            disabled={googleSubmitting || !GOOGLE_CLIENT_ID}
            title={
              !GOOGLE_CLIENT_ID
                ? 'Đăng nhập Google chưa được cấu hình'
                : undefined
            }
          >
            {googleSubmitting ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Đang xử lý...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Đăng nhập với Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
