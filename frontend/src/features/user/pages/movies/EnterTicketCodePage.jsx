import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { apiPost } from '../../../../shared/api/client';

export default function EnterTicketCodePage() {
  const [searchParams] = useSearchParams();
  const initialTicket = searchParams.get('ticket') || '';
  const [step, setStep] = useState(1); // 1 = nhập mã vé, 2 = nhập mã PIN
  const [ticketCode, setTicketCode] = useState(initialTicket);
  const [isTicketActivated, setIsTicketActivated] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingOverrideData, setPendingOverrideData] = useState(null);
  const pinInputs = useRef([]);
  const glowRef1 = useRef(null);
  const glowRef2 = useRef(null);
  const isHoveringRef = useRef(false);
  const timeRef = useRef(0);
  const animationRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showConfirmModal) return;

    const animate = () => {
      timeRef.current += 0.015; // Tốc độ di chuyển tự động
      if (!isHoveringRef.current && glowRef1.current && glowRef2.current) {
        // Chuyển động lượn lờ mượt mà theo hình sin/cos
        const offsetX1 = Math.sin(timeRef.current) * 80;
        const offsetY1 = Math.cos(timeRef.current) * 80;
        const offsetX2 = Math.cos(timeRef.current * 0.8) * 100;
        const offsetY2 = Math.sin(timeRef.current * 0.8) * 100;

        glowRef1.current.style.transform = `translate(${offsetX1}px, ${offsetY1}px)`;
        glowRef2.current.style.transform = `translate(${offsetX2}px, ${offsetY2}px)`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [showConfirmModal]);

  const handleModalMouseMove = (e) => {
    if (!glowRef1.current || !glowRef2.current) return;
    isHoveringRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Chuyển động nhanh hơn khi có chuột
    glowRef1.current.style.transform = `translate(${(x - centerX) / 3}px, ${(y - centerY) / 3}px)`;
    glowRef2.current.style.transform = `translate(${-(x - centerX) / 4}px, ${-(y - centerY) / 4}px)`;
  };

  const handleModalMouseLeave = () => {
    isHoveringRef.current = false;
  };

  useEffect(() => {
    if (initialTicket) {
      apiPost('/tickets/check', { ticketCode: initialTicket })
        .then((res) => {
          setIsTicketActivated(res.isActivated);
          if (res.isActivated) {
            setStep(2);
          } else {
            setStep(1);
          }
        })
        .catch(() => {
          setStep(1);
        });
    }
  }, [initialTicket]);

  const [pinLockTimeLeft, setPinLockTimeLeft] = useState(() =>
    Math.max(
      0,
      Math.ceil(
        (Number(localStorage.getItem('pin-locked-until')) - Date.now()) / 1000
      )
    )
  );

  useEffect(() => {
    const lockedUntil = localStorage.getItem('pin-locked-until');
    if (lockedUntil) {
      const timeLeft = Math.ceil((parseInt(lockedUntil) - Date.now()) / 1000);
      if (timeLeft <= 0) {
        localStorage.removeItem('pin-locked-until');
        localStorage.setItem('pin-attempts', '0');
      }
    }
  }, []);

  useEffect(() => {
    if (pinLockTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setPinLockTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [pinLockTimeLeft]);

  useEffect(() => {
    if (step === 2 && pinInputs.current[0]) {
      setTimeout(() => pinInputs.current[0]?.focus(), 300);
    }
  }, [step]);

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (pinLockTimeLeft > 0) {
      setError(
        `Hệ thống đang bị khóa do nhập sai PIN. Vui lòng thử lại sau ${pinLockTimeLeft} giây.`
      );
      return;
    }
    const valStr = ticketCode || '';
    if (!valStr.trim()) {
      setError('Vui lòng nhập mã vé.');
      return;
    }
    if (/\s/.test(valStr)) {
      setError('Mã vé không được chứa khoảng trắng.');
      return;
    }
    if (valStr.trim().length < 6) {
      setError('Mã vé phải có ít nhất 6 ký tự.');
      return;
    }
    setError('');

    try {
      const response = await apiPost('/tickets/check', {
        ticketCode: ticketCode.trim(),
      });
      if (response.isActivated) {
        setError(
          'Mã vé này đã được kích hoạt trước đó. Vui lòng dùng mã vé khác hoặc vào Vé của tôi để xem phim.'
        );
        setIsSubmitting(false);
        return;
      }
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(2);
        setIsTransitioning(false);
        setIsSubmitting(false);
      }, 300);
    } catch (err) {
      setError(err.message || 'Lỗi khi kiểm tra mã vé.');
      setIsSubmitting(false);
    }
  };

  const handlePinChange = (e, index) => {
    const value = e.target.value;
    if (!/^[0-9]?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');
    if (value && index < 5) pinInputs.current[index + 1]?.focus();
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        pinInputs.current[index - 1]?.focus();
      } else {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinInputs.current[index + 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6).toUpperCase();
    if (pasted) {
      const newPin = Array(6).fill('');
      pasted.split('').forEach((char, i) => {
        if (i < 6) newPin[i] = char;
      });
      setPin(newPin);
      pinInputs.current[Math.min(pasted.length, 5)]?.focus();
      setError('');
    }
  };

  const handleConfirmOverride = async () => {
    if (!pendingOverrideData) return;
    try {
      const payloadOverride = {
        ...pendingOverrideData,
        forceOverride: true,
      };
      const response = await apiPost('/tickets/activate', payloadOverride);
      response.streamToken;
      response.movieId;
      const expiresAt = response.expiresAt;
      const consumedTimeSeconds = response.consumedTimeSeconds || 0;
      const timeLimitMinutes = response.timeLimitMinutes || 0;
      if (expiresAt || timeLimitMinutes) {
        localStorage.setItem(
          `ticket-status-${pendingOverrideData.ticketCode}`,
          JSON.stringify({ expiresAt, consumedTimeSeconds, timeLimitMinutes })
        );
        localStorage.removeItem(
          `ticket-consumed-${pendingOverrideData.ticketCode}`
        );
      }
      navigate(
        `/watch-online?ticket=${ticketCode}&token=${encodeURIComponent(response.streamToken)}&movieId=${response.movieId}`,
        { replace: true }
      );
    } catch (overrideErr) {
      setError(overrideErr.message || 'Lỗi hệ thống khi xác thực PIN.');
      setShowConfirmModal(false);
      setPin(['', '', '', '', '', '']);
      setTimeout(() => pinInputs.current[0]?.focus(), 10);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const code = pin.join('');
    if (code.length < 6) {
      setError('Vui lòng nhập đủ 6 ký tự mã PIN');
      return;
    }

    setIsSubmitting(true);

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', deviceId);
    }

    try {
      // Call backend to activate/validate ticket and PIN
      const payload = {
        ticketCode: ticketCode,
        pinCode: code,
        forceOverride: false,
        deviceId: deviceId,
        isActivateIntent: !isTicketActivated,
      };

      const response = await apiPost('/tickets/activate', payload);

      // Store token if needed, or pass via URL
      const streamToken = response.streamToken;
      const movieId = response.movieId;
      const expiresAt = response.expiresAt;
      const consumedTimeSeconds = response.consumedTimeSeconds || 0;
      const timeLimitMinutes = response.timeLimitMinutes || 0;
      if (expiresAt || timeLimitMinutes) {
        localStorage.setItem(
          `ticket-status-${ticketCode}`,
          JSON.stringify({ expiresAt, consumedTimeSeconds, timeLimitMinutes })
        );
        localStorage.removeItem(`ticket-consumed-${ticketCode}`);
      }

      // Navigate to watch online
      setIsSubmitting(false);
      navigate(
        `/watch-online?ticket=${ticketCode}&token=${encodeURIComponent(streamToken)}&movieId=${movieId}`,
        { replace: true }
      );
    } catch (err) {
      setIsSubmitting(false);
      if (err.code === 'CONCURRENT_STREAM') {
        setPendingOverrideData({
          ticketCode: ticketCode,
          pinCode: code,
          deviceId: deviceId,
          isActivateIntent: !isTicketActivated,
        });
        setShowConfirmModal(true);
      } else {
        setError(err.message || 'Lỗi hệ thống khi xác thực PIN.');
        setPin(['', '', '', '', '', '']);
        setTimeout(() => pinInputs.current[0]?.focus(), 10);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white selection:bg-red-500/30 relative overflow-hidden">
      <Header />

      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-700/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-900/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      ></div>

      <main className="flex-1 flex items-center justify-center px-4 relative z-10 py-20">
        <div
          className={`w-full max-w-md transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
        >
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`flex items-center gap-2 transition-all duration-300 ${step === s ? 'opacity-100' : 'opacity-40'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300
                    ${step > s ? 'bg-[#e61a27] border-[#e61a27] text-white' : step === s ? 'border-[#e61a27] text-[#e61a27]' : 'border-gray-200 dark:border-white/20 text-gray-400 dark:text-white/40'}`}
                  >
                    {step > s ? (
                      <span className="material-symbols-outlined text-[14px]">
                        check
                      </span>
                    ) : (
                      s
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-widest ${step === s ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'}`}
                  >
                    {s === 1 ? 'Mã Vé' : 'Mã PIN'}
                  </span>
                </div>
                {s < 2 && (
                  <div
                    className={`flex-1 max-w-[60px] h-px transition-all duration-500 ${step > 1 ? 'bg-[#e61a27]' : 'bg-gray-200 dark:bg-white/10'}`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Card */}
          <div className="relative bg-white dark:bg-black/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent"></div>

            <div className="p-8 md:p-10">
              {step === 1 ? (
                <form
                  onSubmit={handleTicketSubmit}
                  className="flex flex-col gap-7"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#e61a27]/10 border border-[#e61a27]/30 flex items-center justify-center mx-auto mb-5">
                      <span className="material-symbols-outlined text-[32px] text-[#e61a27]">
                        confirmation_number
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827] dark:text-white uppercase tracking-wider mb-1">
                      Nhập Mã Vé
                    </h1>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">
                      Bước 1 / 2 — Xác thực vé
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-2">
                      Mã xác thực vé
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        placeholder="Nhập mã vé của bạn..."
                        value={ticketCode}
                        onChange={(e) => {
                          setTicketCode(e.target.value.toUpperCase());
                          setError('');
                        }}
                        className="w-full bg-gray-50 dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3.5 text-[#111827] dark:text-white text-center text-lg tracking-[0.2em] placeholder:text-gray-400 dark:placeholder:text-gray-700 placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:border-[#e61a27] focus:shadow-[0_0_10px_rgba(230,26,39,0.15)] transition-all duration-300 uppercase"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-600 text-[20px]">
                        key
                      </span>
                    </div>
                    {error && (
                      <p className="mt-2.5 text-[#e61a27] text-xs font-medium text-center animate-pulse">
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#e61a27] hover:bg-[#c00] text-white font-bold uppercase tracking-[0.15em] py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(230,26,39,0.5)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Tiếp tục'}
                    {!isSubmitting && (
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/my-tickets')}
                    className="text-xs text-[#111827] dark:text-[#9D9D9D] hover:text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] transition-colors underline underline-offset-4 decoration-white/10 text-center"
                  >
                    Xem lịch sử vé của tôi
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handlePinSubmit}
                  className="flex flex-col gap-7"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#e61a27]/10 border border-[#e61a27]/30 flex items-center justify-center mx-auto mb-5">
                      <span className="material-symbols-outlined text-[32px] text-[#e61a27]">
                        dialpad
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827] dark:text-white uppercase tracking-wider mb-1">
                      Nhập Mã PIN
                    </h1>
                    <p className="text-[#111827] dark:text-[#9D9D9D] text-xs uppercase tracking-widest">
                      Bước 2 / 2 — Xác nhận bảo mật
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[14px] text-[#e61a27]">
                        confirmation_number
                      </span>
                      <span className="text-gray-700 dark:text-white/70 text-xs tracking-wider">
                        {ticketCode}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#111827] dark:text-[#9D9D9D] uppercase tracking-widest mb-4 text-center">
                      Mã PIN 6 ký tự
                    </label>
                    <div className="flex gap-2 justify-center">
                      {pin.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (pinInputs.current[index] = el)}
                          type="password"
                          maxLength={1}
                          disabled={pinLockTimeLeft > 0}
                          value={digit}
                          onChange={(e) => handlePinChange(e, index)}
                          onKeyDown={(e) => handlePinKeyDown(e, index)}
                          onPaste={index === 0 ? handlePinPaste : undefined}
                          className={`w-11 h-14 sm:w-12 sm:h-16 bg-gray-50 dark:bg-[#0d0d0d] rounded-lg text-center text-2xl font-bold outline-none transition-all duration-200 border uppercase
                            ${digit ? 'border-[#e61a27] text-[#e61a27] shadow-[0_0_8px_rgba(230,26,39,0.2)] bg-[#e61a27]/5' : 'border-gray-200 dark:border-white/10 text-[#111827] dark:text-white hover:border-gray-300 dark:hover:border-white/20 focus:border-[#e61a27] focus:bg-[#e61a27]/5'}
                            ${pinLockTimeLeft > 0 ? 'opacity-30 cursor-not-allowed border-red-500/20' : ''}`}
                        />
                      ))}
                    </div>
                    {pinLockTimeLeft > 0 && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-[#e61a27] bg-[#e61a27]/10 border border-[#e61a27]/20 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px] animate-pulse">
                          lock_clock
                        </span>
                        Hệ thống bị khóa: {Math.floor(pinLockTimeLeft / 60)}m{' '}
                        {pinLockTimeLeft % 60}s
                      </div>
                    )}
                    {error && (
                      <p className="mt-3 text-[#e61a27] text-xs font-medium text-center animate-pulse">
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={pinLockTimeLeft > 0 || isSubmitting}
                    className="w-full bg-[#e61a27] hover:bg-[#c00] text-white font-bold uppercase tracking-[0.15em] py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(230,26,39,0.5)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Đang kích hoạt...' : 'Kích hoạt'}
                    {!isSubmitting && (
                      <span className="material-symbols-outlined text-[18px]">
                        lock_open
                      </span>
                    )}
                  </button>

                  <div className="flex justify-between items-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setPin(['', '', '', '', '', '']);
                        setError('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-[#e50914] text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:bg-[#e50914]/10 hover:shadow-[0_0_10px_rgba(229,9,20,0.3)] transition-all font-medium text-[12px] whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_back
                      </span>
                      Quay lại nhập mã vé
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/login/forgot-pin')}
                      className="text-[12px] font-bold text-[#e61a27] hover:text-[#ff4d5a] transition underline decoration-[#e61a27]/30 underline-offset-4"
                    >
                      Quên mã PIN?
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 md:px-0 bg-black/80 backdrop-blur-md transition-opacity">
          <div
            className="rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 w-full max-w-[440px] relative bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            onMouseMove={handleModalMouseMove}
            onMouseLeave={handleModalMouseLeave}
            onMouseEnter={() => {
              isHoveringRef.current = true;
            }}
          >
            {/* Interactive Deep Red Nebula Background Effect */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div
                ref={glowRef1}
                className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] bg-red-600/40 rounded-full blur-[80px] mix-blend-screen transition-transform duration-300 ease-out"
              ></div>
              <div
                ref={glowRef2}
                className="absolute bottom-[-150px] right-[-150px] w-[450px] h-[450px] bg-[#ff0015]/30 rounded-full blur-[90px] mix-blend-screen transition-transform duration-300 ease-out"
              ></div>
            </div>

            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent z-20 opacity-80"></div>

            {/* Content Area */}
            <div className="p-8 relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-900/40 flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)] flex-shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                  <span
                    className="material-symbols-outlined text-red-500 text-3xl drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    warning
                  </span>
                </div>
                <h2 className="text-[22px] font-bold text-[#111827] dark:text-white tracking-tight drop-shadow-md">
                  <span className="text-[#111827] dark:text-white">R</span>
                  <span>ap</span>
                  <span className="text-red-500">L</span>
                  <span className="text-red-500">o</span>
                  <span className="text-red-500">F</span>
                  <span className="text-red-500">ilm</span>
                  <span className="font-normal text-gray-500 dark:text-[#9D9D9D] ml-1">
                    cho biết
                  </span>
                </h2>
              </div>

              <div className="text-[15.5px] text-gray-500 dark:text-[#9D9D9D] leading-relaxed text-left">
                Hệ thống phát hiện mã vé
                <strong className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md font-mono tracking-widest mx-1.5 shadow-[0_0_12px_rgba(251,191,36,0.25)] inline-block">
                  {ticketCode}
                </strong>
                đang được xem trên một thiết bị khác.
                <div className="mt-6 bg-gradient-to-r from-red-900/40 to-transparent border-l-4 border-red-500 p-4 rounded-r-xl shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-500/5 backdrop-blur-sm"></div>
                  <div className="relative z-10 text-red-100/90 text-[14.5px] leading-relaxed">
                    <span className="font-bold text-white tracking-wide uppercase text-xs mr-2 bg-red-500 px-2 py-0.5 rounded-sm shadow-md">
                      Lưu ý
                    </span>
                    Nếu tiếp tục, phiên xem trên thiết bị kia sẽ ngay lập tức bị{' '}
                    <span className="font-semibold text-red-300 underline decoration-red-500/50 underline-offset-2">
                      ngắt kết nối
                    </span>
                    .
                  </div>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="p-6 pt-0 flex justify-center gap-6 relative z-10 w-full">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingOverrideData(null);
                }}
                className="flex items-center justify-center gap-2 w-[140px] py-3 rounded-xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-sm tracking-wide"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmOverride}
                className="w-[140px] py-3 rounded-xl text-sm text-white font-bold tracking-wide transition-all duration-300 bg-[#e61a27] hover:bg-[#ff1a1a] hover:scale-110 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(255,26,26,0.9)] shadow-[0_0_15px_rgba(230,26,39,0.5)] border border-transparent hover:border-red-400"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
