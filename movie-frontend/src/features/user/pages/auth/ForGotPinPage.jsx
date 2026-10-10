import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import * as authService from '../../api/services/authService';
import { apiPost } from '../../../../shared/api/client';

const GLASS_INPUT_CLASS =
  'w-full rounded-2xl border border-gray-200 dark:border-red-500/20 bg-white/70 dark:bg-black/45 px-4 py-4 text-[15px] text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-text-muted transition-all duration-300 outline-none backdrop-blur-xl focus:border-red-400 dark:focus:border-[#d77567] focus:bg-white dark:focus:bg-black/55 focus:shadow-md focus:shadow-red-500/5 focus:ring-1 focus:ring-red-400/30 dark:focus:ring-[#d77567]/30';
const GLASS_ICON_CLASS = 'text-[20px] text-gray-700 dark:text-gray-500';
const GLASS_LABEL_CLASS = 'text-xs font-semibold uppercase tracking-[0.2em] text-gray-900 dark:text-gray-400 mb-2 block';
function Countdown({ seconds, onResend }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  if (left > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-white/20 bg-gray-100/80 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
        <span className="material-symbols-outlined text-[16px]">schedule</span>
        Gửi lại sau <span className="text-red-500 dark:text-red-400 font-bold ml-0.5">{left}s</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-white/20 bg-white dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-300 shadow-sm transition-all hover:bg-gray-50 hover:text-red-600 dark:hover:bg-white/20 dark:hover:text-white"
      onClick={onResend}
    >
      <span className="material-symbols-outlined text-[16px]">refresh</span>
      Gửi lại mã
    </button>
  );
}

export default function ForGotPinPage() {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [errors, setErrors] = useState({});
  const [localMessage, setLocalMessage] = useState({ text: '', type: '' });
  const [emailSuggestion, setEmailSuggestion] = useState('');
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  const validateEmailField = (valStr) => {
    const trimmedEmail = valStr.trim();
    if (!trimmedEmail) return 'Vui lòng nhập email.';
    if (/\s/.test(valStr)) return 'Email không chứa khoảng trắng.';
    if (!/@/.test(valStr)) return "Email phải chứa ký tự '@'.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) return 'Email không đúng định dạng (VD: example@gmail.com).';
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    const err = validateEmailField(val);
    setErrors((prev) => ({ ...prev, email: err }));
    if (val && !val.includes('@')) {
      setEmailSuggestion(val + '@gmail.com');
      setShowEmailSuggestion(true);
    } else {
      setEmailSuggestion('');
      setShowEmailSuggestion(false);
    }
  };

  const handleEmailBlur = () => {
    let val = email.trim();
    if (val && !val.includes('@')) {
      val = val + '@gmail.com';
      setEmail(val);
    }
    const err = validateEmailField(val);
    setErrors((prev) => ({ ...prev, email: err }));
    setShowEmailSuggestion(false);
  };

  const applyEmailSuggestion = () => {
    if (emailSuggestion) {
      setEmail(emailSuggestion);
      setErrors((prev) => ({ ...prev, email: '' }));
      setShowEmailSuggestion(false);
      setEmailSuggestion('');
    }
  };

  const showMessage = (text, type = 'success') => {
    let displayText = text;
    if (type === 'error' && text) {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('brevo') || lowerText.includes('unauthorized') || lowerText.includes('401') || lowerText.includes('500')) {
        displayText = 'Hệ thống đang gặp sự cố kết nối. Vui lòng thử lại sau.';
      }
    }
    setLocalMessage({ text: displayText, type });
    setTimeout(() => {
      setLocalMessage((prev) => prev.text === displayText ? { text: '', type: '' } : prev);
    }, 5000);
  };



  const otpRefs = useRef([]);
  const pinRefs = useRef([]);
  const confirmPinRefs = useRef([]);

  const ErrorMsg = ({ msg }) =>
    msg ? (
      <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
        <span className="material-symbols-outlined text-[13px] shrink-0">error</span>
        {msg}
      </span>
    ) : null;

  const validateStep1 = () => {
    const err = validateEmailField(email);
    if (err) {
      setErrors({ email: err });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep3 = () => {
    const errs = {};
    const pinStr = pin.join('');
    const confirmPinStr = confirmPin.join('');
    if (pinStr.length < 6) errs.pin = 'Vui lòng nhập đủ 6 số cho mã PIN mới.';

    if (confirmPinStr.length < 6) errs.confirmPin = 'Vui lòng xác nhận đủ 6 số.';
    else if (pinStr !== confirmPinStr) errs.confirmPin = 'Mã PIN xác nhận không khớp.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();

    let emailVal = email.trim();
    if (emailVal && !emailVal.includes('@')) {
      emailVal = emailVal + '@gmail.com';
      setEmail(emailVal);
    }

    const err = validateEmailField(emailVal);
    if (err) {
      setErrors({ email: err });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await apiPost('/users/pin/forgot', { email: emailVal });
      showMessage(`Mã OTP đã được gửi đến ${emailVal}.`, 'success');
      setStep(2);
      setOtpTimer(60);
      setErrors({});
    } catch (err) {
      let msg = err.message || 'Lỗi hệ thống.';
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('brevo') || lowerMsg.includes('unauthorized') || lowerMsg.includes('401') || lowerMsg.includes('500') || lowerMsg.includes('thất bại')) {
        msg = 'Hệ thống đang gặp sự cố kết nối. Vui lòng thử lại sau.';
      } else if (lowerMsg.includes('not found') || lowerMsg.includes('không tồn tại')) {
        msg = 'Email không tồn tại trong hệ thống!';
      }
      setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (code) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length < 6) return; // Chưa đủ 6 số thì bỏ qua
    // OTP sẽ được xác thực cùng với mã PIN mới ở bước reset-pin (bước 3)
    // Bước này chỉ chuyển sang step 3 sau khi user nhập đủ 6 số
    showMessage('Nhập mã PIN mới để hoàn tất!', 'success');
    setStep(3);
  };

  const handleOtpChange = (idx, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d)) {
      handleVerifyOtp(next.join(''));
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const chars = text.split('');
      const next = Array(6).fill('');
      chars.forEach((c, i) => { if (i < 6) next[i] = c; });
      setOtp(next);
      otpRefs.current[Math.min(chars.length - 1, 5)]?.focus();
      if (chars.length >= 6) {
        handleVerifyOtp(next.join(''));
      }
    }
    e.preventDefault();
  };

  const handlePinChange = (idx, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...pin];
    next[idx] = val;
    setPin(next);
    setErrors(p => ({ ...p, pin: '' }));
    if (val && idx < 5) {
      pinRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const chars = text.split('');
      const next = Array(6).fill('');
      chars.forEach((c, i) => { if (i < 6) next[i] = c; });
      setPin(next);
      pinRefs.current[Math.min(chars.length - 1, 5)]?.focus();
    }
    e.preventDefault();
  };

  const handleConfirmPinChange = (idx, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...confirmPin];
    next[idx] = val;
    setConfirmPin(next);
    setErrors(p => ({ ...p, confirmPin: '' }));
    if (val && idx < 5) {
      confirmPinRefs.current[idx + 1]?.focus();
    }
  };

  const handleConfirmPinKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !confirmPin[idx] && idx > 0) {
      confirmPinRefs.current[idx - 1]?.focus();
    }
  };

  const handleConfirmPinPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const chars = text.split('');
      const next = Array(6).fill('');
      chars.forEach((c, i) => { if (i < 6) next[i] = c; });
      setConfirmPin(next);
      confirmPinRefs.current[Math.min(chars.length - 1, 5)]?.focus();
    }
    e.preventDefault();
  };

  const handleResendOtp = async () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await apiPost('/users/pin/forgot', { email });
      setOtpTimer(60);
      showMessage('Đã gửi lại mã OTP.', 'success');
    } catch (err) {
      showMessage(err.message || 'Lỗi hệ thống.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;
    setLoading(true);
    try {
      await apiPost('/users/pin/reset', {
        email,
        otp: otp.join(''),
        newPin: pin.join(''),
        confirmPin: confirmPin.join(''),
      });
      if (user) {
        showMessage('Lưu mã PIN mới thành công!', 'success');
        setTimeout(() => navigate('/profile'), 1500);
      } else {
        showMessage('Lưu mã PIN mới thành công! Vui lòng đăng nhập lại.', 'success');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      showMessage(err.message || 'Lỗi hệ thống.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page relative min-h-screen overflow-x-hidden bg-white dark:bg-black text-gray-900 dark:text-white antialiased">
      {/* Image Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://res.cloudinary.com/df3fzqvrd/image/upload/v1785438443/fXsWS_gf0qwx.jpg"
          alt="Auth Background"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-white/30 dark:bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/70 dark:from-black/85 via-white/30 dark:via-black/50 to-transparent" />
      </div>

      <div className="relative z-20 flex min-h-screen items-center justify-center px-6 py-6 text-gray-900 dark:text-white">
        <div id="forgot-password-card" className="relative w-full max-w-xl rounded-3xl border border-white/60 dark:border-white/20 bg-white/80 dark:bg-black/40 backdrop-blur-2xl p-8 shadow-[0_16px_60px_rgba(0,0,0,0.05)] dark:shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-600/15 backdrop-blur-md">
              <span className="material-symbols-outlined text-2xl text-red-500">
                {step === 1 ? 'key' : step === 2 ? 'mark_email_read' : 'lock_reset'}
              </span>
            </div>
            <h2 className="mb-1 text-2xl font-bold tracking-wide text-gray-900 dark:text-white">
              {step === 1 ? 'Quên mã PIN?' : step === 2 ? 'Xác thực OTP' : 'Tạo mã PIN mới'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-500">
              {step === 1 && 'Nhập email đã đăng ký để nhận mã xác thực.'}
              {step === 2 && `Nhập mã OTP đã gửi đến ${email}.`}
              {step === 3 && 'Thiết lập mã PIN bảo mật mới.'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-7 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= s
                    ? 'bg-red-600 text-white'
                    : 'border border-gray-400 dark:border-white/20 text-gray-800 dark:text-gray-500'
                    }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div className={`h-px w-8 transition-colors ${step > s ? 'bg-red-500' : 'bg-gray-400 dark:bg-white/15'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Local Message */}
          {localMessage.text && (
            <div className={`mb-6 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 ${localMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-500/30 shadow-md' : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border border-red-400 dark:border-red-500/30 shadow-md'}`}>
              <span className="material-symbols-outlined text-[20px]">
                {localMessage.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <p>{localMessage.text}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <form noValidate onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-1 relative text-left">
                <label className={GLASS_LABEL_CLASS}>Email</label>
                <div className="relative">
                  <span className={`material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} ${errors.email ? '!text-red-500' : ''}`}>mail</span>
                  <input
                    className={`${GLASS_INPUT_CLASS} pl-11 ${errors.email ? '!border-red-500' : ''} ${user ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Nhập email của bạn"
                    type="text"
                    value={email}
                    disabled={!!user}
                    onBlur={handleEmailBlur}
                    onChange={handleEmailChange}
                    onKeyDown={(e) => {
                      if ((e.key === 'Tab' || e.key === 'Enter') && showEmailSuggestion) {
                        e.preventDefault();
                        applyEmailSuggestion();
                      }
                      if (e.key === 'Escape') {
                        setShowEmailSuggestion(false);
                      }
                    }}
                  />
                  {/* Email suggestion dropdown */}
                  {showEmailSuggestion && (
                    <div
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-full cursor-pointer overflow-hidden rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#18181b] shadow-xl"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={applyEmailSuggestion}
                    >
                      <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#222]">
                        <span className="material-symbols-outlined text-[18px] shrink-0 text-[#888]">mail</span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] text-[#888]">Ý bạn là:</span>
                          <span className="block truncate text-[14px] font-medium text-[#111827] dark:text-white">
                            <span className="text-[#ccc]">{email.split('@')[0]}</span>
                            <span className="text-red-400">@gmail.com</span>
                          </span>
                        </div>
                        <span className="shrink-0 rounded border border-[#444] bg-[#222] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#888]">
                          Tab
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <ErrorMsg msg={errors.email} />
              </div>
              <button
                className="w-full bg-[#e61a27] hover:bg-[#ff1a27] text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 uppercase tracking-widest shadow-[0_10px_20px_rgba(230,26,39,0.3)] hover:shadow-[0_15px_30px_rgba(230,26,39,0.5)] transition-all mt-4 disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <label className="block text-[11px] text-[#111827] dark:text-[#9D9D9D] uppercase tracking-widest mb-3 text-center">Mã OTP 6 số</label>
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    className={`w-11 h-14 sm:w-12 sm:h-16 bg-[#0d0d0d] rounded-lg text-center text-2xl font-bold outline-none transition-all duration-200 border uppercase ${digit ? 'border-[#e61a27] text-[#e61a27] shadow-[0_0_8px_rgba(230,26,39,0.2)] bg-[#e61a27]/5' : 'border-gray-200 dark:border-white/10 text-white hover:border-gray-200 dark:border-white/20 focus:border-[#e61a27] focus:bg-[#e61a27]/5'}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  />
                ))}
              </div>
              {loading && <p className="text-sm text-[#888]">Đang xác thực...</p>}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-white/20 bg-white dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-300 shadow-sm transition-all hover:bg-gray-50 hover:text-red-600 dark:hover:bg-white/20 dark:hover:text-white"
                  onClick={() => setStep(1)}
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Đổi email
                </button>
                <Countdown seconds={otpTimer} onResend={handleResendOtp} />
              </div>
            </div>
          )}

          {/* Step 3: New Pin */}
          {step === 3 && (
            <form noValidate onSubmit={handleResetPin} className="space-y-6">
              <div>
                <label className="block text-[11px] text-[#111827] dark:text-[#9D9D9D] uppercase tracking-widest mb-3 text-center">Mã PIN mới</label>
                <div className="flex justify-center gap-2" onPaste={handlePinPaste}>
                  {pin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (pinRefs.current[idx] = el)}
                      type="password"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      className={`w-11 h-14 sm:w-12 sm:h-16 bg-[#0d0d0d] rounded-lg text-center text-2xl font-bold outline-none transition-all duration-200 border uppercase ${digit ? 'border-[#e61a27] text-[#e61a27] shadow-[0_0_8px_rgba(230,26,39,0.2)] bg-[#e61a27]/5' : 'border-gray-200 dark:border-white/10 text-white hover:border-gray-200 dark:border-white/20 focus:border-[#e61a27] focus:bg-[#e61a27]/5'} ${errors.pin ? '!border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.2)] ring-1 ring-red-500/50' : ''}`}
                    />
                  ))}
                </div>
                <ErrorMsg msg={errors.pin} />
              </div>
              <div>
                <label className="block text-[11px] text-[#111827] dark:text-[#9D9D9D] uppercase tracking-widest mb-3 text-center">Xác nhận mã PIN mới</label>
                <div className="flex justify-center gap-2" onPaste={handleConfirmPinPaste}>
                  {confirmPin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (confirmPinRefs.current[idx] = el)}
                      type="password"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleConfirmPinChange(idx, e.target.value)}
                      onKeyDown={(e) => handleConfirmPinKeyDown(idx, e)}
                      className={`w-11 h-14 sm:w-12 sm:h-16 bg-[#0d0d0d] rounded-lg text-center text-2xl font-bold outline-none transition-all duration-200 border uppercase ${digit ? 'border-[#e61a27] text-[#e61a27] shadow-[0_0_8px_rgba(230,26,39,0.2)] bg-[#e61a27]/5' : 'border-gray-200 dark:border-white/10 text-white hover:border-gray-200 dark:border-white/20 focus:border-[#e61a27] focus:bg-[#e61a27]/5'} ${errors.confirmPin ? '!border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.2)] ring-1 ring-red-500/50' : ''}`}
                    />
                  ))}
                </div>
                <ErrorMsg msg={errors.confirmPin} />
              </div>
              <button
                className="w-full bg-[#e61a27] hover:bg-[#ff1a27] text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 uppercase tracking-widest shadow-[0_10px_20px_rgba(230,26,39,0.3)] hover:shadow-[0_15px_30px_rgba(230,26,39,0.5)] transition-all mt-4 disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Thiết Lập PIN'}
                {!loading && <span className="material-symbols-outlined text-[20px]">lock_open</span>}
              </button>
            </form>
          )}

          {/* Footer Back Button */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                } else {
                  navigate(-1);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-medium text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Quay lại trang trước đó
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
