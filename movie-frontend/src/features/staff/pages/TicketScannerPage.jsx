import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QrCode, Search, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Popcorn, User, Calendar, Clock, MapPin, Film, ShieldAlert, Plus, Minus, Sparkles } from 'lucide-react';
import jsQR from 'jsqr';
import { apiGet, apiPost } from '../../../shared/api/client';
import useThemeStore from '../../../shared/store/themeStore';
import { useToastStore } from '../../admin/hooks/useToastStore';

export default function TicketScannerPage() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const addToast = useToastStore((s) => s.addToast);
  const showToast = (message, type = 'info') => addToast({ message, type });
  const [searchParams, setSearchParams] = useSearchParams();

  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Map of comboId -> selected quantity for individual seat check-in
  const [comboQuantities, setComboQuantities] = useState({});

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();

    const queryCode = searchParams.get('code');
    if (queryCode && !ticketData && !loading) {
      setInputCode(queryCode);
      handleFetchTicket(queryCode);
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.log('Video play catch:', err));
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => { });
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      const scanFrame = () => {
        if (!streamRef.current) return;
        const video = videoRef.current;

        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

          const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrResult && qrResult.data) {
            console.log('QR Code Detected:', qrResult.data);
            extractAndScan(qrResult.data);
            stopCamera();
            return;
          }
        }
        animFrameRef.current = requestAnimationFrame(scanFrame);
      };

      setTimeout(() => {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }, 300);

    } catch (err) {
      console.error('Camera access error:', err);
      showToast('Không thể mở Camera. Vui lòng kiểm tra quyền truy cập camera hoặc nhập mã thủ công.', 'error');
      setIsCameraActive(false);
    }
  };

  const extractAndScan = (rawString) => {
    if (!rawString) return;
    let code = rawString.trim();

    if (code.includes('/scan/offline/')) {
      const parts = code.split('/scan/offline/');
      if (parts.length > 1) {
        code = parts[1].split('?')[0].split('#')[0];
      }
    }

    setInputCode(code);
    handleFetchTicket(code);
  };

  const handleFetchTicket = async (codeToFetch) => {
    const targetCode = (codeToFetch || inputCode).trim();
    if (!targetCode) {
      showToast('Vui lòng nhập hoặc quét mã vé.', 'warning');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setTicketData(null);
    setComboQuantities({});
    setJustCheckedIn(false);

    try {
      const data = await apiGet(`/scan/offline/${encodeURIComponent(targetCode)}`);
      setTicketData(data);
      setSearchParams({ code: targetCode });
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMsg(err.message || 'Không tìm thấy mã vé này trong hệ thống.');
      setSearchParams({});
    } finally {
      setLoading(false);
    }
  };

  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const formatNow = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const handleIncreaseQty = (comboId, maxQty) => {
    setComboQuantities((prev) => {
      const current = prev[comboId] || 0;
      if (current < maxQty) {
        return { ...prev, [comboId]: current + 1 };
      }
      return prev;
    });
  };

  const handleDecreaseQty = (comboId) => {
    setComboQuantities((prev) => {
      const current = prev[comboId] || 0;
      if (current > 0) {
        const next = current - 1;
        if (next === 0) {
          const copy = { ...prev };
          delete copy[comboId];
          return copy;
        }
        return { ...prev, [comboId]: next };
      }
      return prev;
    });
  };

  const handleCheckIn = async () => {
    const code = ticketData?.ticketCode || inputCode;
    if (!code) return;
    setActionLoading(true);
    try {
      const payload = {};
      if (!ticketData.isGeneralBooking) {
        const selectedCombos = Object.entries(comboQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([comboId, quantity]) => ({ comboId, quantity }));
        if (selectedCombos.length > 0) {
          payload.selectedCombos = selectedCombos;
        }
      }

      const res = await apiPost(`/scan/offline/${encodeURIComponent(code)}/check-in`, payload);
      const msg = res?.message || res?.data?.message || 'Soát vé thành công!';
      showToast(msg, 'success');

      setJustCheckedIn(true);
      setShowSuccessModal(true);

      // Re-fetch ticket to update full UI status
      handleFetchTicket(code);
    } catch (err) {
      console.error('Check-in error:', err);
      showToast(err.message || 'Lỗi khi soát vé.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = () => {
    setInputCode('');
    setTicketData(null);
    setErrorMsg('');
    setComboQuantities({});
    setJustCheckedIn(false);
    setShowSuccessModal(false);
    setSearchParams({});
    inputRef.current?.focus();
  };

  const isAllGeneralDone = ticketData?.isGeneralBooking && 
    ticketData.allTickets?.every(t => t.isScanned) &&
    (!ticketData.combos || ticketData.combos.every(c => c.redeemedQuantity >= c.quantity));

  // Determine if current seat is the LAST unscanned seat in the booking
  const unscannedSeatCount = ticketData?.allTickets?.filter(t => !t.isScanned).length || 0;
  const isLastSeatInBooking = !ticketData?.isGeneralBooking && !ticketData?.isScanned && unscannedSeatCount === 1;

  const totalSelectedComboQty = Object.values(comboQuantities).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="space-y-6 w-full mx-auto flex flex-col min-h-[calc(100vh-120px)]">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Hệ Thống Soát Vé Chiếu Rạp (QR Scanner)
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
              Quét mã QR trên vé cứng/vé điện tử để kiểm tra và cho khách vào rạp
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Input & Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[600px]">
        {/* Left Column: Input Form & Camera Toggle */}
        <div className={`p-6 rounded-2xl border lg:col-span-1 space-y-4 flex flex-col ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <h2 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
            Quét mã / Nhập mã vé
          </h2>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchTicket();
            }}
            className="space-y-3"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Nhập mã vé tổng hoặc mã ghế lẻ..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${isDarkMode
                  ? 'bg-zinc-800/60 border-zinc-700 text-white focus:border-red-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-red-500'
                  }`}
              />
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Tra Cứu Vé
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-dashed border-zinc-700/50 flex-1 flex flex-col">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className={`w-full py-2.5 border rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${isDarkMode
                  ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                  : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                <QrCode className="w-4 h-4 text-red-500" />
                Mở Camera Quét QR
              </button>
            ) : (
              <div className="space-y-2 flex flex-col items-center">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-square w-full max-w-[300px] border-2 border-red-500/50 mx-auto">
                  <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-red-500 m-8 rounded-lg pointer-events-none animate-pulse"></div>
                </div>
                <button
                  onClick={stopCamera}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg"
                >
                  Tắt Camera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Result Display */}
        <div className={`p-8 rounded-2xl border lg:col-span-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col justify-between min-h-[400px]`}>
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500/20 border-t-red-500"></div>
              <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Đang tra cứu thông tin vé...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-4 bg-red-500/10 text-red-500 rounded-full">
                <XCircle className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-500">Không tìm thấy vé!</h3>
                <p className={`text-sm mt-1 max-w-md ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{errorMsg}</p>
              </div>
            </div>
          ) : ticketData ? (
            <div className="space-y-6">
              {/* Status Alert Banner */}
              {justCheckedIn ? (
                <div className="p-4 rounded-xl bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-start justify-between gap-3 shadow-lg shadow-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-7 h-7 shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <h4 className="font-extrabold text-lg uppercase tracking-wider text-emerald-300">
                        XÁC NHẬN THÀNH CÔNG!
                      </h4>
                      <p className="text-xs font-medium text-emerald-200 mt-0.5">
                        Vé <span className="font-bold text-emerald-100 whitespace-nowrap">{ticketData.seatName?.replace(/TÔNG/gi, 'TỔNG').replace(/GHÊ/gi, 'GHẾ')}</span> đã được soát lúc {ticketData.scannedAt || formatNow()}. Cho phép khách hàng vào rạp!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-lg transition-all shrink-0"
                  >
                    Quét Vé Tiếp Theo
                  </button>
                </div>
              ) : ticketData.isScanned ? (
                <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-500 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-base uppercase tracking-wider">CẢNH BÁO: VÉ ĐÃ ĐƯỢC QUÉT TRƯỚC ĐÓ!</h4>
                    <p className="text-xs opacity-90 mt-0.5">Vé này đã được soát vé{ticketData.scannedAt ? ` vào lúc ${ticketData.scannedAt}` : ''}. Vui lòng kiểm tra lại để tránh gian lận tái sử dụng vé.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-400 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-base uppercase tracking-wider">VÉ HỢP LỆ - CHƯA SỬ DỤNG</h4>
                    <p className="text-xs opacity-90 mt-0.5">Thông tin hợp lệ. Nhấn "Xác Nhận Soát Vé (Check-in)" bên dưới để hoàn tất.</p>
                  </div>
                </div>
              )}

              {/* Ticket Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-50 border-slate-200'} flex gap-4`}>
                  {ticketData.moviePoster && (
                    <img
                      src={ticketData.moviePoster}
                      alt={ticketData.movieName}
                      className="w-24 h-36 object-cover rounded-lg shadow-md shrink-0"
                    />
                  )}
                  <div className="space-y-2 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-500 uppercase tracking-wider">
                      <Film className="w-5 h-5" /> Phim & Ghế
                    </div>
                    <p className={`font-bold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ticketData.movieName}</p>
                    <div className="flex items-center justify-between text-base mt-auto pt-2 gap-2">
                      <span className={`${isDarkMode ? 'text-zinc-400' : 'text-slate-500'} shrink-0 whitespace-nowrap`}>Ghế ngồi:</span>
                      <span className="font-bold text-red-500 text-base md:text-lg text-right truncate leading-tight">{ticketData.seatName?.replace(/TÔNG/gi, 'TỔNG').replace(/GHÊ/gi, 'GHẾ')}</span>
                    </div>
                  </div>
                </div>

                <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-50 border-slate-200'} space-y-2 flex flex-col justify-center`}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-500 uppercase tracking-wider">
                    <MapPin className="w-5 h-5" /> Rạp & Suất Chiếu
                  </div>
                  <p className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ticketData.branchName}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Phòng: <span className="font-semibold text-white">{ticketData.roomName}</span></p>
                  <div className="flex items-center gap-4 text-sm font-medium text-amber-500 pt-1 mt-auto">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {ticketData.showDate}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {ticketData.startTime}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-zinc-800/30 border-zinc-800' : 'bg-slate-50 border-slate-200'} text-sm space-y-1`}>
                <span className="text-slate-400 flex items-center gap-1 font-semibold"><User className="w-4 h-4" /> Khách hàng:</span>
                <p className={`font-semibold text-base ${isDarkMode ? 'text-amber-400' : 'text-slate-900'}`}>{ticketData.customerName}</p>
                <p className={`${isDarkMode ? 'text-amber-200/60' : 'text-slate-500'}`}>{ticketData.customerEmail}</p>
              </div>

              {/* VÉ TỔNG (General Booking View) */}
              {ticketData.isGeneralBooking ? (
                <div className="space-y-4 pt-4 border-t border-zinc-700/50">
                  <h3 className="font-bold text-amber-500 uppercase text-xs tracking-wider">Trạng Thái Danh Sách Ghế:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ticketData.allTickets?.map((t, i) => (
                      <div key={i} className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${t.isScanned ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                        <span>{t.seatName}</span>
                        {t.isScanned ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="opacity-60 text-[10px] font-normal">Chưa Check-in</span>}
                      </div>
                    ))}
                  </div>

                  {ticketData.combos && ticketData.combos.length > 0 && (
                    <>
                      <h3 className="font-bold text-amber-500 uppercase text-xs tracking-wider mt-4">Trạng Thái Combo Bắp Nước:</h3>
                      <div className="space-y-2">
                        {ticketData.combos.map((c, i) => {
                          const isFullyRedeemed = c.redeemedQuantity >= c.quantity;
                          return (
                            <div key={i} className={`p-3.5 rounded-xl border flex items-center justify-between ${isFullyRedeemed ? 'bg-zinc-800/20 border-zinc-800 opacity-75' : isDarkMode ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-slate-50 border-slate-200'}`}>
                              <div>
                                <p className={`font-semibold text-sm ${isFullyRedeemed ? 'text-zinc-400 line-through' : isDarkMode ? 'text-amber-400' : 'text-slate-900'}`}>{c.name}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                  Số lượng đã nhận: <span className="font-bold text-white">{c.redeemedQuantity} / {c.quantity}</span>
                                </p>
                                {c.redeemedBySeats && (
                                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                                    Ghế đã nhận: <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 font-bold">{c.redeemedBySeats}</span>
                                  </p>
                                )}
                              </div>

                              <div>
                                {isFullyRedeemed ? (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-500 border border-zinc-700">ĐÃ ĐỔI HẾT</span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">CÒN {c.quantity - c.redeemedQuantity} PHẦN</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Single Action Button for General Ticket Scan */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-zinc-700/50">
                    <button
                      onClick={handleReset}
                      className="w-full sm:w-auto px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm rounded-xl transition-all border border-zinc-700"
                    >
                      QUÉT VÉ KHÁCH TIẾP THEO
                    </button>
                    {!isAllGeneralDone ? (
                      <button
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                        className="flex-1 w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        XÁC NHẬN SOÁT VÉ & ĐỔI TẤT CẢ COMBO
                      </button>
                    ) : (
                      <div className="flex-1 w-full py-3.5 bg-zinc-800 text-emerald-400 font-bold text-sm rounded-xl text-center border border-emerald-500/30 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ĐƠN VÉ & COMBO ĐÃ ĐƯỢC CHECK-IN TOÀN BỘ
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* VÉ TỪNG GHẾ LẺ (Individual Seat View, e.g. H3) */
                <div className="space-y-4 pt-4 border-t border-zinc-700/50">
                  {ticketData.combos && ticketData.combos.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-amber-500 uppercase text-xs tracking-wider flex items-center gap-1.5">
                          <Popcorn className="w-4 h-4 text-amber-500" /> Chọn Số Lượng Combo Cho Ghế {ticketData.seatName}:
                        </h3>
                        {isLastSeatInBooking ? (
                          <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                            <Sparkles className="w-3.5 h-3.5" /> GHẾ CUỐI CÙNG — Tự động nhận tất cả Combo còn lại
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400">Chọn số lượng combo lấy cho ghế này</span>
                        )}
                      </div>

                      {/* Banner notification for LAST SEAT */}
                      {isLastSeatInBooking && (
                        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                          <span>Đây là ghế cuối cùng chưa soát vé trong đơn hàng! Hệ thống sẽ tự động đổi toàn bộ các Combo còn lại cho ghế này.</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        {ticketData.combos.map((c, i) => {
                          const maxRemaining = c.quantity - c.redeemedQuantity;
                          const isFullyRedeemed = maxRemaining <= 0;
                          const selectedQty = comboQuantities[c.id] || 0;

                          return (
                            <div
                              key={i}
                              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                isFullyRedeemed
                                  ? 'bg-zinc-800/30 border-zinc-800 opacity-60'
                                  : selectedQty > 0
                                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                                    : 'bg-zinc-800/50 border-zinc-700'
                              }`}
                            >
                              <div>
                                <p className={`font-semibold text-sm ${selectedQty > 0 ? 'text-amber-400 font-bold' : isDarkMode ? 'text-zinc-200' : 'text-slate-900'}`}>
                                  {c.name}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                  Đã nhận: <span className="font-bold text-white">{c.redeemedQuantity} / {c.quantity}</span>
                                  {!isFullyRedeemed && <span className="ml-2 text-amber-400 font-medium">(Còn lại {maxRemaining} phần)</span>}
                                  {c.redeemedBySeats && <span className="ml-2 text-emerald-400 font-medium">(Đã lấy: {c.redeemedBySeats})</span>}
                                </p>
                              </div>

                              <div>
                                {isFullyRedeemed ? (
                                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">ĐÃ ĐỔI HẾT</span>
                                ) : isLastSeatInBooking ? (
                                  <span className="text-[11px] font-extrabold px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">TỰ ĐỘNG ĐỔI {maxRemaining} PHẦN</span>
                                ) : (
                                  /* Quantity Selector (- / +) */
                                  <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-700">
                                    <button
                                      type="button"
                                      onClick={() => handleDecreaseQty(c.id)}
                                      disabled={selectedQty === 0}
                                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center disabled:opacity-30 transition-all"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-sm text-amber-400">
                                      {selectedQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleIncreaseQty(c.id, maxRemaining)}
                                      disabled={selectedQty >= maxRemaining}
                                      className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center disabled:opacity-30 transition-all"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Individual Seat Scan */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-zinc-700/50 w-full">
                    {ticketData.isScanned ? (
                      <button
                        onClick={handleReset}
                        className="flex-1 w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <QrCode className="w-5 h-5" />
                        QUÉT VÉ KHÁCH TIẾP THEO
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                        className="flex-1 w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        XÁC NHẬN SOÁT VÉ (CHECK-IN GHẾ {ticketData.seatName})
                        {isLastSeatInBooking 
                          ? ' + ĐỔI TẤT CẢ COMBO CÒN LẠI' 
                          : totalSelectedComboQty > 0 ? ` + ĐỔI ${totalSelectedComboQty} PHẦN COMBO` : ''}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
              <QrCode className="w-16 h-16 text-slate-500 opacity-40" />
              <div>
                <p className={`font-semibold text-base ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Sẵn sàng soát vé</p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Nhập mã vé hoặc bật Camera để quét mã QR xuất trình bởi khách hàng.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal Dialog */}
      {showSuccessModal && ticketData && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`max-w-md w-full p-7 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-2xl space-y-6 text-center`}>
            <div className="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-bold tracking-tight uppercase text-emerald-400">
                Soát Vé Thành Công
              </h3>
              <p className={`text-sm mt-2 leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                Vé đã được kích hoạt thành công. Xin mời khách hàng vào rạp!
              </p>
            </div>

            <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-slate-50 border-slate-200'} text-left text-sm space-y-3 shadow-inner`}>
              <div className="flex justify-between items-center border-b border-zinc-500/20 pb-2.5">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phim:</span>
                <span className={`font-bold text-right truncate max-w-[200px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ticketData.movieName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-500/20 pb-2.5 gap-2">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} shrink-0 whitespace-nowrap`}>Ghế ngồi:</span>
                <span className="font-bold text-red-500 text-lg text-right truncate">{ticketData.seatName?.replace(/TÔNG/gi, 'TỔNG').replace(/GHÊ/gi, 'GHẾ')}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-500/20 pb-2.5">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phòng chiếu:</span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ticketData.roomName} - {ticketData.branchName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Khách hàng:</span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ticketData.customerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                Quét Vé Tiếp Theo
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className={`px-5 py-3.5 border rounded-xl font-bold text-sm transition-all ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
