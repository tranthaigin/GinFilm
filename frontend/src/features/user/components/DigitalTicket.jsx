import { useState, useRef } from "react";
import { createPortal } from 'react-dom';
import * as htmlToImage from 'html-to-image';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuthStore } from '../store/authStore';
import { getMembershipClass, getMembershipTier } from '../../../shared/constants/membership';
import { useMembershipStore } from '../../../shared/store/membershipStore';

export default function DigitalTicket({
    ticket,
    showSuccessMessage = false,
}) {
    const [isCodeVisible, setIsCodeVisible] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [selectedDetailQR, setSelectedDetailQR] = useState(null);
    const [showAllSeats, setShowAllSeats] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadingSeats, setIsDownloadingSeats] = useState(false);
    const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
    const ticketRef = useRef(null);
    const seatRefs = useRef({});
    const user = useAuthStore((state) => state.user);
    const membershipTiers = useMembershipStore((state) => state.tiers);
    const membershipTier = getMembershipTier(user?.memberPoints, membershipTiers, user?.membershipTier);
    const membershipClass = getMembershipClass(membershipTier.level);

    // 1. Chỉ lưu ảnh mã vé tổng
    const handleDownloadImage = async (e) => {
        e.stopPropagation();
        if (!ticketRef.current || isDownloading) return;
        setIsDownloading(true);

        const wasHiddenCode = !isCodeVisible;
        const wasHiddenSeats = !showAllSeats && seatsCount > 5;
        if (wasHiddenCode || wasHiddenSeats) {
            if (wasHiddenCode) setIsCodeVisible(true);
            if (wasHiddenSeats) setShowAllSeats(true);
            await new Promise(resolve => setTimeout(resolve, 300)); // wait for render
        }

        try {
            const dataUrl = await htmlToImage.toPng(ticketRef.current, {
                pixelRatio: 2,
                backgroundColor: '#FFFFFF',
                filter: (node) => {
                    // Don't include elements marked to be ignored
                    if (node?.getAttribute && node.getAttribute('data-html2canvas-ignore') === 'true') {
                        return false;
                    }
                    return true;
                }
            });

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Ve_GINFILM_Tong_${ticket?.ticketCode || ticket?.id || 'TICKET'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Lỗi khi lưu ảnh vé tổng:', err);
        } finally {
            if (wasHiddenCode) {
                setIsCodeVisible(false);
            }
            if (wasHiddenSeats) {
                setShowAllSeats(false);
            }
            setIsDownloading(false);
        }
    };

    // 2. Lưu tất cả mã vé từng ghế
    const handleDownloadAllSeatTickets = async () => {
        if (isDownloadingSeats || !ticket?.ticketDetails?.length) return;
        setIsDownloadingSeats(true);
        try {
            for (let i = 0; i < ticket.ticketDetails.length; i++) {
                const detail = ticket.ticketDetails[i];
                const seatEl = seatRefs.current?.[i];
                if (seatEl) {
                    await new Promise(resolve => setTimeout(resolve, 350));
                    const seatDataUrl = await htmlToImage.toPng(seatEl, {
                        pixelRatio: 2,
                        backgroundColor: '#FFFFFF',
                    });
                    const seatLink = document.createElement('a');
                    seatLink.href = seatDataUrl;
                    seatLink.download = `Ve_GINFILM_Ghe_${detail.seatName}_${detail.ticketCode || i}.png`;
                    document.body.appendChild(seatLink);
                    seatLink.click();
                    document.body.removeChild(seatLink);
                }
            }
        } catch (err) {
            console.error('Lỗi khi lưu tất cả ảnh vé ghế:', err);
        } finally {
            setIsDownloadingSeats(false);
        }
    };

    // 3. Lưu duy nhất 1 mã vé của 1 ghế đang chọn
    const handleDownloadSingleSeatTicket = async (detail) => {
        if (isDownloadingSingle || !detail) return;
        const idx = ticket?.ticketDetails?.findIndex(d => d.ticketCode === detail.ticketCode);
        const seatEl = idx >= 0 ? seatRefs.current?.[idx] : null;
        if (!seatEl) return;

        setIsDownloadingSingle(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const seatDataUrl = await htmlToImage.toPng(seatEl, {
                pixelRatio: 2,
                backgroundColor: '#FFFFFF',
            });
            const seatLink = document.createElement('a');
            seatLink.href = seatDataUrl;
            seatLink.download = `Ve_GINFILM_Ghe_${detail.seatName}_${detail.ticketCode || idx}.png`;
            document.body.appendChild(seatLink);
            seatLink.click();
            document.body.removeChild(seatLink);
        } catch (err) {
            console.error('Lỗi khi lưu ảnh vé ghế:', err);
        } finally {
            setIsDownloadingSingle(false);
        }
    };

    if (!ticket) return null;

    const seatsRaw = Array.isArray(ticket?.seats) ? ticket.seats.join(', ') : (typeof ticket?.seats === 'string' ? ticket.seats : '');
    const seatsArray = seatsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const seatsCount = seatsArray.length;
    seatsArray.join(', ');

    const chunkedSeats = [];
    for (let i = 0; i < seatsArray.length; i += 5) {
        chunkedSeats.push(seatsArray.slice(i, i + 5).join(', '));
    }

    const hasMultipleSeats = ticket?.ticketDetails?.length > 1;

    return (
        <div className={`membership-ticket ${membershipClass} relative z-10 w-full max-w-[360px] m-auto shrink-0 font-sans p-2`}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@600;700;800&display=swap');
        .font-tech { font-family: 'Space Grotesk', sans-serif; }

        .shadow-ticket-light {
            filter: drop-shadow(0 20px 35px rgba(0, 0, 0, 0.3)) drop-shadow(0 0 45px rgba(245, 158, 11, 0.5));
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), filter 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .shadow-ticket-light:hover {
            transform: translateY(-6px);
            filter: drop-shadow(0 30px 45px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 65px rgba(245, 158, 11, 0.8));
        }

        .ticket-cutout {
            -webkit-mask-image: radial-gradient(circle at 0% 68%, transparent 11px, black 11.5px), radial-gradient(circle at 100% 68%, transparent 11px, black 11.5px);
            -webkit-mask-size: 51% 100%, 51% 100%;
            -webkit-mask-position: left top, right top;
            -webkit-mask-repeat: no-repeat;
            mask-image: radial-gradient(circle at 0% 68%, transparent 11px, black 11.5px), radial-gradient(circle at 100% 68%, transparent 11px, black 11.5px);
            mask-size: 51% 100%, 51% 100%;
            mask-position: left top, right top;
            mask-repeat: no-repeat;
        }

        .ticket-header-cut {
            clip-path: polygon(16px 0%, calc(100% - 16px) 0%, 100% 16px, 100% 100%, 0% 100%, 0% 16px);
        }

        .light-ticket-bg {
            background: #FFFFFF !important;
            background: linear-gradient(165deg, #FFFFFF 0%, #F8FAFC 50%, #E2E8F0 100%) !important;
        }

        .bg-mesh-light {
            background-image: radial-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px);
            background-size: 16px 16px;
        }

        .bg-watermark-light {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='210' height='110' viewBox='0 0 210 110'%3E%3Ctext x='15' y='65' fill='%230f172a' fill-opacity='0.18' font-family='Inter, sans-serif' font-weight='900' font-size='24' transform='rotate(-25 105 55)'%3EGINFILM%3C/text%3E%3C/svg%3E");
        }

        .card-3d-light {
            background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
            box-shadow:
                0 12px 22px -4px rgba(15, 23, 42, 0.15),
                0 4px 8px -2px rgba(15, 23, 42, 0.08),
                inset 0 1px 2px rgba(255, 255, 255, 1),
                inset 0 -2px 4px rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(203, 213, 225, 0.9);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .card-3d-light:hover {
            transform: translateY(-2px);
            box-shadow:
                0 16px 26px -4px rgba(15, 23, 42, 0.22),
                0 6px 12px -2px rgba(245, 158, 11, 0.25),
                inset 0 1px 2px rgba(255, 255, 255, 1);
        }

        .title-3d-light {
            color: #0f172a;
            text-shadow:
                0 1px 0 #cbd5e1,
                0 2px 0 #94a3b8,
                0 3px 0 #64748b,
                0 4px 8px rgba(0, 0, 0, 0.3),
                0 0 18px rgba(245, 158, 11, 0.35);
            letter-spacing: 0.05em;
        }
      `}</style>

            {/* TICKET CARD LIGHT CONTAINER */}
            <div ref={ticketRef} className="membership-ticket-surface w-full rounded-3xl light-ticket-bg bg-mesh-light text-slate-900 ticket-cutout shadow-ticket-light overflow-hidden flex flex-col justify-between relative min-h-[580px] bg-white">

                {/* Atmospheric Background Glow Elements */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-10 -left-20 w-40 h-40 bg-[#e61a27]/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Watermark Overlay Light */}
                <div className="absolute inset-0 bg-watermark-light pointer-events-none z-0"></div>

                {/* Ticket Top Header Shield */}
                <div className="bg-slate-100/90 backdrop-blur-md p-5 text-center relative ticket-header-cut border-b border-slate-200">
                    <h2 className="text-2xl font-black text-slate-950 font-tech tracking-widest uppercase flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[#e61a27] text-[22px]">confirmation_number</span>
                        GINFILM
                    </h2>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mt-1">GINFILM - TRON VEN DIEN ANH</p>
                    <span className="membership-ticket-tier mt-2 inline-flex rounded-full border px-3 py-1 text-[9px] font-black tracking-[0.18em]">
                        {membershipTier.name}
                    </span>
                    <div className="w-12 h-1 bg-gradient-to-r from-amber-500 to-[#e61a27] mx-auto mt-3 rounded-full"></div>
                </div>

                {/* Ticket Main Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 relative z-10 bg-white/40">

                    {/* Category Badge & Movie Title */}
                    <div className="space-y-2 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#e61a27] border border-[#e61a27]/30 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                            <span className="material-symbols-outlined text-[12px]">movie</span>
                            VÉ XEM PHIM
                        </span>
                        <h3 className="text-[26px] font-black uppercase font-tech leading-tight pt-1 title-3d-light transform -rotate-1 line-clamp-2">
                            {ticket?.movie?.replace(/^GIN\s*FILM\s*[-|:]?\s*/i, '')}
                        </h3>
                    </div>

                    {/* Information Grid Block 1: Date & Time */}
                    <div className="grid grid-cols-2 gap-3 card-3d-light rounded-2xl p-4 text-left">
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">NGÀY CHIẾU</span>
                            <span className="text-[15px] font-extrabold text-slate-900">{ticket?.date}</span>
                        </div>
                        <div className="border-l border-slate-200 pl-3 text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">GIỜ CHIẾU</span>
                            <span className="text-[15px] font-extrabold text-[#e61a27]">{ticket?.time}</span>
                        </div>
                    </div>

                    {/* Information Grid Block 2: Cinema Details & Seat */}
                    <div className="card-3d-light rounded-2xl p-4 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 text-xs pb-2 border-b border-slate-200">
                            <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">PHÒNG CHIẾU</span>
                                <span className="font-extrabold text-slate-900">{ticket?.roomName}</span>
                            </div>
                            <div className="border-l border-slate-200 pl-2 text-right">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">LOẠI RẠP</span>
                                <span className="font-extrabold text-amber-600">2D</span>
                            </div>
                        </div>

                        {/* Cinema Location & Seat Row */}
                        <div className="flex items-center justify-between text-xs pt-0.5">
                            <div className="flex-1 pr-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">RẠP CHIẾU</span>
                                <span className="font-extrabold text-slate-900 break-words line-clamp-2">{ticket?.branchName?.replace(/^GIN\s*FILM\s*\|\s*/i, '')}</span>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">GHẾ ({seatsCount})</span>
                                <div className="flex flex-col items-end">
                                    <div
                                        className="font-black text-[#e61a27] text-[13px] sm:text-sm break-words max-w-[220px] text-left"
                                    >
                                        {showAllSeats
                                            ? chunkedSeats.map((chunk, idx) => (
                                                <div key={idx}>{chunk}{idx < chunkedSeats.length - 1 ? ',' : ''}</div>
                                              ))
                                            : chunkedSeats[0] + (seatsCount > 5 ? '...' : '')
                                        }
                                    </div>
                                    {seatsCount > 5 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowAllSeats(!showAllSeats); }}
                                            className="text-[10px] text-slate-400 hover:text-slate-600 font-medium mt-1 flex items-center gap-0.5 bg-slate-100/80 px-2 py-0.5 rounded"
                                            data-html2canvas-ignore="true"
                                        >
                                            {showAllSeats ? 'Thu gọn' : 'Xem thêm'}
                                            <span className="material-symbols-outlined text-[12px]">{showAllSeats ? 'expand_less' : 'expand_more'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Success Message */}
                    {showSuccessMessage && (
                        <div className="w-full flex justify-center z-20 relative pt-1" data-html2canvas-ignore="true">
                            <div className="bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full flex items-center justify-center gap-2 shadow-sm">
                                <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Giao dịch thành công</span>
                            </div>
                        </div>
                    )}

                    {/* QR Code Container (Visible when isCodeVisible is true) */}
                    {isCodeVisible && (
                        <div className="w-full flex flex-col items-center justify-center mt-2 pb-2 transition-all duration-300">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-[0_0_15px_rgba(15,23,42,0.1)] mb-2 relative">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
                                <QRCodeCanvas
                                    value={`${window.location.origin}/scan/offline/${ticket?.ticketCode || ticket?.id || 'N/A'}`}
                                    size={150}
                                    level="Q"
                                    includeMargin={false}
                                />
                            </div>
                        </div>
                    )}

                    {/* Booking Code Display always visible */}
                    <div className="w-full flex flex-col items-center justify-center mt-2 pb-1">
                        <span className="text-[12px] font-black text-slate-800 tracking-widest uppercase bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            MÃ VÉ TỔNG: {ticket?.ticketCode || ticket?.id}
                        </span>
                    </div>



                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1" data-html2canvas-ignore="true">
                        {hasMultipleSeats ? (
                            <>
                                <button
                                    onClick={() => { setIsListModalOpen(true); setIsCodeVisible(false); }}
                                    className="col-span-2 py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-[12px] uppercase flex items-center justify-center space-x-2 transition shadow-md"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-amber-400">qr_code_scanner</span>
                                    <span>XEM MÃ TỪNG GHẾ ({ticket.ticketDetails.length})</span>
                                </button>
                                <button onClick={() => setIsCodeVisible(!isCodeVisible)} className="py-2.5 px-2 rounded-xl bg-slate-200/90 hover:bg-slate-300 text-slate-800 font-bold text-[11px] uppercase flex items-center justify-center space-x-1.5 transition border border-slate-300 shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-slate-700">{isCodeVisible ? 'visibility_off' : 'qr_code_scanner'}</span>
                                    <span>{isCodeVisible ? 'ẨN MÃ TỔNG' : 'HIỆN MÃ TỔNG'}</span>
                                </button>
                                <button onClick={handleDownloadImage} disabled={isDownloading} className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[11px] uppercase flex items-center justify-center space-x-1.5 shadow-md transition disabled:opacity-50 disabled:cursor-wait">
                                    <span className="material-symbols-outlined text-[16px] text-amber-400">
                                        {isDownloading ? 'hourglass_empty' : 'download'}
                                    </span>
                                    <span>{isDownloading ? 'ĐANG LƯU...' : 'LƯU MÃ TỔNG'}</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsCodeVisible(!isCodeVisible)} className="py-2.5 px-2 rounded-xl bg-slate-200/90 hover:bg-slate-300 text-slate-800 font-bold text-[11px] uppercase flex items-center justify-center space-x-1.5 transition border border-slate-300 shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-slate-700">{isCodeVisible ? 'visibility_off' : 'qr_code_scanner'}</span>
                                    <span>{isCodeVisible ? 'ẨN MÃ QR' : 'HIỂN THỊ MÃ'}</span>
                                </button>
                                <button onClick={handleDownloadImage} disabled={isDownloading} className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[11px] uppercase flex items-center justify-center space-x-1.5 shadow-md transition disabled:opacity-50 disabled:cursor-wait">
                                    <span className="material-symbols-outlined text-[16px] text-amber-400">
                                        {isDownloading ? 'hourglass_empty' : 'download'}
                                    </span>
                                    <span>{isDownloading ? 'ĐANG LƯU...' : 'LƯU MÃ VÉ'}</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Multi-seat QR List Modal Overlay */}
                    {isListModalOpen && hasMultipleSeats && createPortal(
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-html2canvas-ignore="true">
                            <div className={`bg-white w-full ${selectedDetailQR ? 'max-w-[400px]' : 'max-w-[900px]'} max-h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 transition-all`}>
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                    <span className="font-bold text-lg text-slate-800">DANH SÁCH VÉ TỪNG GHẾ ({ticket.ticketDetails.length})</span>
                                    <div className="flex items-center gap-2">
                                        {!selectedDetailQR && (
                                            <button
                                                onClick={handleDownloadAllSeatTickets}
                                                disabled={isDownloadingSeats}
                                                className="px-3 py-1.5 bg-[#e61a27] hover:bg-red-700 text-white font-bold text-xs uppercase rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {isDownloadingSeats ? 'hourglass_empty' : 'download'}
                                                </span>
                                                <span>{isDownloadingSeats ? 'ĐANG LƯU...' : 'LƯU TẤT CẢ MÃ'}</span>
                                            </button>
                                        )}
                                        <button onClick={() => { setIsListModalOpen(false); setSelectedDetailQR(null); }} className="text-slate-500 hover:text-red-500 transition bg-slate-200 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/50">
                                {selectedDetailQR ? (
                                    <div className="flex flex-col items-center justify-between h-full animate-in fade-in zoom-in duration-200 pb-2">
                                        <div className="flex flex-col items-center text-center space-y-1 w-full mt-2">
                                            <span className="font-black text-base text-slate-800 uppercase line-clamp-2 leading-tight">{ticket?.movie}</span>
                                            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-slate-500">
                                                <span>{ticket?.date}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                                <span className="text-[#e61a27]">{ticket?.time}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">{ticket?.branchName?.replace(/^GIN\s*FILM\s*\|\s*/i, '')} - {ticket?.roomName}</span>
                                        </div>

                                        <div className="flex flex-col items-center space-y-3 my-auto pt-4 pb-2">
                                            <span className="font-black text-xl text-[#e61a27] uppercase tracking-widest">GHẾ: {selectedDetailQR.seatName}</span>
                                            <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-md">
                                                <QRCodeCanvas
                                                    value={`${window.location.origin}/scan/offline/${selectedDetailQR.ticketCode}`}
                                                    size={160}
                                                    level="Q"
                                                    includeMargin={false}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">MÃ: {selectedDetailQR.ticketCode}</span>
                                        </div>

                                        <div className="w-full flex flex-col gap-2 mt-3">
                                            <button
                                                onClick={() => handleDownloadSingleSeatTicket(selectedDetailQR)}
                                                disabled={isDownloadingSingle}
                                                className="w-full px-4 py-3 bg-[#e61a27] hover:bg-red-700 text-white rounded-xl text-[11px] font-bold uppercase transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-wait"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {isDownloadingSingle ? 'hourglass_empty' : 'download'}
                                                </span>
                                                <span>{isDownloadingSingle ? 'ĐANG LƯU...' : 'LƯU MÃ VÉ NÀY'}</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedDetailQR(null)}
                                                className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase transition shadow-md flex items-center justify-center space-x-2"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                                <span>QUAY LẠI DANH SÁCH</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {ticket.ticketDetails.map((detail, idx) => (
                                            <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${detail.isScanned ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-300 shadow-sm hover:shadow-md hover:border-slate-400'}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-black text-lg text-slate-800">GHẾ {detail.seatName}</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${detail.isScanned ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {detail.isScanned ? 'ĐÃ SỬ DỤNG' : 'HỢP LỆ'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedDetailQR(detail)}
                                                    disabled={detail.isScanned}
                                                    className={`w-full py-2.5 rounded-xl font-bold text-[11px] uppercase transition flex items-center justify-center gap-2 ${detail.isScanned ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-black shadow-md'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">{detail.isScanned ? 'block' : 'qr_code_2'}</span>
                                                    <span>{detail.isScanned ? 'ĐÃ QUÉT' : 'HIỂN THỊ MÃ QR'}</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    , document.body)}

                </div>

                {/* Offscreen container for individual Seat Tickets (for downloading) */}
                <div className="fixed top-0 left-[-9999px] z-[-1] pointer-events-none" aria-hidden="true" data-html2canvas-ignore="true">
                    {ticket?.ticketDetails?.map((detail, idx) => (
                        <div
                            key={detail.ticketCode || idx}
                            ref={(el) => {
                                if (!seatRefs.current) seatRefs.current = {};
                                seatRefs.current[idx] = el;
                            }}
                            className="w-[360px] bg-white rounded-[28px] p-6 border border-slate-200 shadow-xl flex flex-col items-center text-center font-sans"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-center space-x-2 mb-1">
                                <span className="font-black text-2xl tracking-wider text-[#e61a27]">GINFILM</span>
                            </div>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-600">GINFILM - TRON VEN DIEN ANH</span>

                            <span className="mt-3 px-3 py-1 rounded-full bg-red-50 text-red-600 font-bold text-[11px] uppercase border border-red-200">
                                VÉ TỪNG GHẾ - VÀO RẠP
                            </span>

                            {/* Movie Info */}
                            <h3 className="font-black text-lg text-slate-900 mt-3 mb-1 uppercase leading-snug">
                                {ticket?.movie}
                            </h3>
                            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-slate-600 mb-1">
                                <span>{ticket?.date}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <span className="text-[#e61a27]">{ticket?.time}</span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase">
                                {ticket?.branchName?.replace(/^GIN\s*FILM\s*\|\s*/i, '')} - {ticket?.roomName}
                            </span>

                            {/* Seat Badge */}
                            <div className="my-4 px-6 py-2.5 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800">
                                <span className="font-black text-2xl tracking-widest text-amber-400">GHẾ: {detail.seatName}</span>
                            </div>

                            {/* QR Code */}
                            <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm mb-3">
                                <QRCodeCanvas
                                    value={`${window.location.origin}/scan/offline/${detail.ticketCode}`}
                                    size={180}
                                    level="Q"
                                    includeMargin={false}
                                />
                            </div>

                            {/* Ticket Code */}
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                MÃ GHẾ: {detail.ticketCode}
                            </span>

                            <span className="text-[10px] text-slate-400 mt-3 italic">
                                Vui lòng xuất trình mã QR này tại cổng kiểm soát vé
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

