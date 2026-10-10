import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import * as authService from '../../api/services/authService';

const GLASS_INPUT_CLASS =
  'w-full rounded-2xl border border-gray-200 dark:border-red-500/20 bg-white/70 dark:bg-black/45 px-4 py-4 text-[15px] text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-text-muted transition-all duration-300 outline-none backdrop-blur-xl focus:border-red-400 dark:focus:border-[#d77567] focus:bg-white dark:focus:bg-black/55 focus:shadow-md focus:shadow-red-500/5 focus:ring-1 focus:ring-red-400/30 dark:focus:ring-[#d77567]/30';
const GLASS_ICON_CLASS = 'text-[20px] text-gray-700 dark:text-gray-500';
const GLASS_LABEL_CLASS = 'text-xs font-semibold uppercase tracking-[0.2em] text-gray-900 dark:text-gray-400';

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

export default function ForGotPasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const showToast = useToastStore((s) => s.showToast);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [errors, setErrors] = useState({});
  const [localMessage, setLocalMessage] = useState({ text: '', type: '' });
  const [emailSuggestion, setEmailSuggestion] = useState('');
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setErrors((prev) => ({ ...prev, email: '' }));
    if (val && !val.includes('@')) {
      setEmailSuggestion(val + '@gmail.com');
      setShowEmailSuggestion(true);
    } else {
      setEmailSuggestion('');
      setShowEmailSuggestion(false);
    }
  };

  const handleEmailBlur = () => {
    const val = email.trim();
    if (val && !val.includes('@')) {
      const filled = val + '@gmail.com';
      setEmail(filled);
      setErrors((prev) => ({ ...prev, email: '' }));
    }
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

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isPasswordRequirementsVisible, setIsPasswordRequirementsVisible] = useState(false);

  const passwordChecks = useMemo(() => {
    return [
      { label: 'Ít nhất 8 ký tự', ok: password.length >= 8 },
      { label: 'Có chữ hoa', ok: /[A-Z]/.test(password) },
      { label: 'Có chữ thường', ok: /[a-z]/.test(password) },
      { label: 'Có số', ok: /[0-9]/.test(password) },
      { label: 'Có ký tự đặc biệt', ok: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [password]);

  const passwordStrengthPercent = (passwordChecks.filter((item) => item.ok).length / passwordChecks.length) * 100;

  const otpRefs = useRef([]);

  const ErrorMsg = ({ msg }) =>
    msg ? (
      <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
        <span className="material-symbols-outlined text-[13px] shrink-0">error</span>
        {msg}
      </span>
    ) : null;

  const validateStep1 = () => {
    const errs = {};
    const valStr = email || '';
    const trimmedEmail = valStr.trim();
    if (!trimmedEmail) errs.email = 'Vui lòng nhập email.';
    else if (/\s/.test(valStr)) errs.email = 'Email không được chứa khoảng trắng.';
    else if (!/@/.test(valStr)) errs.email = "Email phải chứa ký tự '@'.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) errs.email = 'Email không đúng định dạng (VD: example@gmail.com).';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
    const valStr = password || '';
    if (!valStr) errs.password = 'Vui lòng nhập mật khẩu mới.';
    else if (/^\s/.test(valStr)) errs.password = 'Mật khẩu không được chứa khoảng trắng ở đầu.';
    else if (/\s$/.test(valStr)) errs.password = 'Mật khẩu không được chứa khoảng trắng ở cuối.';
    else if (valStr.length < 8) errs.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    else if (!/[A-Z]/.test(valStr)) errs.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
    else if (!/[a-z]/.test(valStr)) errs.password = 'Mật khẩu phải chứa ít nhất 1 chữ thường.';
    else if (!/[0-9]/.test(valStr)) errs.password = 'Mật khẩu phải chứa ít nhất 1 chữ số.';
    else if (!/[^A-Za-z0-9]/.test(valStr)) errs.password = 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';

    if (!confirmPassword) errs.confirmPassword = 'Vui lòng nhập lại mật khẩu mới.';
    else if (valStr !== confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập.';
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

    const errs = {};
    if (!emailVal) errs.email = 'Vui lòng nhập email.';
    else if (/\s/.test(emailVal)) errs.email = 'Email không được chứa khoảng trắng.';
    else if (!/@/.test(emailVal)) errs.email = "Email phải chứa ký tự '@'.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) errs.email = 'Email không đúng định dạng (VD: example@gmail.com).';

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await authService.forgotPassword(emailVal);
      showMessage(`Mã OTP đã được gửi đến ${emailVal}.`, 'success');
      setStep(2);
      setOtpTimer(60);
      setErrors({});
    } catch (err) {
      const rawMsg = err?.response?.data?.message || err?.message || '';
      let msg = 'Không thể gửi OTP. Vui lòng thử lại.';
      if (rawMsg.toLowerCase().includes('not found') || rawMsg.toLowerCase().includes('không tồn tại')) {
        msg = 'Email không tồn tại trong hệ thống!';
      }
      showMessage(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (code) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length < 6) return;
    showMessage('Nhập mật khẩu mới để hoàn tất!', 'success');
    setStep(3);
    setErrors((prev) => ({ ...prev, otp: '' }));
  };

  const handleOtpChange = (idx, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
    setErrors((prev) => ({ ...prev, otp: '' }));
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
      // Nếu paste đủ 6 số thì tự động xác thực luôn
      if (chars.length >= 6) {
        handleVerifyOtp(next.join(''));
      }
    }
    e.preventDefault();
  };

  const handleResendOtp = async () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setOtpTimer(60);
      showMessage('Đã gửi lại mã OTP.', 'success');
    } catch (err) {
      showMessage(err?.message || 'Không thể gửi lại OTP. Thử lại sau.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    if (otp.join('').length < 6) {
      setStep(2);
      setErrors({ otp: 'Vui lòng nhập mã OTP.' });
      return;
    }

    setLoading(true);
    try {
      const otpCode = otp.join('');
      await authService.resetPassword(email, otpCode, password);
      showMessage('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.', 'success');
      navigate('/login');
    } catch (err) {
      const rawMsg = err?.response?.data?.message || err?.message || '';
      let msg = 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';
      if (rawMsg.toLowerCase().includes('otp') || rawMsg.toLowerCase().includes('mã')) {
        msg = 'Mã OTP không chính xác.';
        setStep(2);
        setOtp(['', '', '', '', '', '']);
        setErrors({ otp: msg });
      }
      showMessage(msg, 'error');
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
              <span className="material-symbols-outlined text-2xl text-red-400">key</span>
            </div>
            <h2 className="mb-1 text-2xl font-bold tracking-wide text-[#111827] dark:text-white">Quên mật khẩu?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {step === 1 && 'Nhập email đã đăng ký để nhận mã xác thực.'}
              {step === 2 && `Nhập mã OTP đã gửi đến ${email}.`}
              {step === 3 && 'Đặt mật khẩu mới cho tài khoản của bạn.'}
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
            <form noValidate onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-1">
                <label className={GLASS_LABEL_CLASS}>Email</label>
                <div className="group relative">
                  <span className={`material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 ${GLASS_ICON_CLASS} group-focus-within:text-red-400`}>mail</span>
                  <input
                    className={`${GLASS_INPUT_CLASS} pl-11 ${errors.email ? '!border-red-500' : ''}`}
                    placeholder="Nhập email của bạn"
                    type="text"
                    value={email}
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
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-full cursor-pointer overflow-hidden rounded-2xl border border-red-500/40 bg-[#1a1010]/95 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={applyEmailSuggestion}
                    >
                      <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-red-500/15">
                        <span className="material-symbols-outlined text-[15px] shrink-0 text-red-400">mail</span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-white/50">
                            Ý bạn là:
                          </span>
                          <span className="block truncate text-[14px] font-semibold text-[#111827] dark:text-white">
                            <span className="text-white/70">{email.split('@')[0]}</span>
                            <span className="text-red-400">@gmail.com</span>
                          </span>
                        </div>
                        <span className="shrink-0 rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          Tab
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <ErrorMsg msg={errors.email} />
              </div>
              <button
                className="w-full rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500 to-red-600 dark:from-[rgba(220,38,38,0.95)] dark:to-[rgba(127,29,29,0.95)] py-4 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(239,68,68,0.25)] dark:shadow-[0_16px_40px_rgba(127,29,29,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(239,68,68,0.35)] dark:hover:shadow-[0_24px_48px_rgba(127,29,29,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    className={`h-14 w-12 rounded-2xl border border-red-500/30 bg-black/50 text-center text-xl font-bold text-white backdrop-blur-xl transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/35 focus:outline-none ${errors.otp ? '!border-red-500' : ''}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  />
                ))}
              </div>
              <div className="flex justify-center">
                <ErrorMsg msg={errors.otp} />
              </div>
              {loading && (
                <p className="text-center text-sm text-white/50">Đang xác thực...</p>
              )}
              <div className="flex items-center justify-between mt-2">
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

          {/* Step 3: New Password */}
          {step === 3 && (
            <form noValidate onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1">
                <label className={GLASS_LABEL_CLASS}>Mật khẩu mới</label>
                <div className="relative">
                  <span className={`material-symbols-outlined input-field-icon ${GLASS_ICON_CLASS} z-10`}>lock</span>
                  <input
                    className={`${GLASS_INPUT_CLASS} input-has-icon pl-11 pr-11 ${errors.password ? '!border-red-500' : ''}`}
                    placeholder="Ít nhất 8 ký tự"
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onFocus={() => setIsPasswordRequirementsVisible(true)}
                    onBlur={() => setIsPasswordRequirementsVisible(false)}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: '' }));
                    }}
                  />
                  <button
                    type="button"
                    aria-label={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f7d7d] transition-colors duration-200 hover:text-[#111827] dark:text-white"
                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isPasswordVisible ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <ErrorMsg msg={errors.password} />

                {isPasswordRequirementsVisible && (
                  <div className="mt-2 rounded-lg border border-[#433737] bg-[#241f1f] px-4 py-3">
                    <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrengthPercent === 100 ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        style={{ width: `${passwordStrengthPercent}%` }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      {passwordChecks.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-[13px]">
                          <span className={item.ok ? 'text-emerald-400' : 'text-white/25'}>✓</span>
                          <span className={item.ok ? 'text-white/80' : 'text-white/45'}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className={GLASS_LABEL_CLASS}>Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <span className={`material-symbols-outlined input-field-icon ${GLASS_ICON_CLASS} z-10`}>lock</span>
                  <input
                    className={`${GLASS_INPUT_CLASS} input-has-icon pl-11 pr-11 ${errors.confirmPassword ? '!border-red-500' : ''}`}
                    placeholder="Nhập lại mật khẩu"
                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }}
                  />
                  <button
                    type="button"
                    aria-label={isConfirmPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f7d7d] transition-colors duration-200 hover:text-[#111827] dark:text-white"
                    onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isConfirmPasswordVisible ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <ErrorMsg msg={errors.confirmPassword} />
              </div>
              <button
                className="w-full rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500 to-red-600 dark:from-[rgba(220,38,38,0.95)] dark:to-[rgba(127,29,29,0.95)] py-4 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(239,68,68,0.25)] dark:shadow-[0_16px_40px_rgba(127,29,29,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(239,68,68,0.35)] dark:hover:shadow-[0_24px_48px_rgba(127,29,29,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-white/40">
            {user ? (
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-medium text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Quay lại
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-medium text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Quay lại trang đăng nhập ngay
              </Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
