import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../store/authStore';
import { getMembershipClass, getMembershipTier } from '../../../shared/constants/membership';
import { useMembershipStore } from '../../../shared/store/membershipStore';

export default function OnlineDigitalTicket({
    ticket,
    showSuccessMessage = false,
    onPlay
}) {
    const [isCodeVisible, setIsCodeVisible] = useState(false);
    const user = useAuthStore((state) => state.user);
    const membershipTiers = useMembershipStore((state) => state.tiers);
    const membershipTier = getMembershipTier(user?.memberPoints, membershipTiers, user?.membershipTier);
    const membershipClass = getMembershipClass(membershipTier.level);

    if (!ticket) return null;

    return (
        <div className={`membership-ticket ${membershipClass} relative z-10 w-full max-w-[360px] m-auto shrink-0 font-sans p-2`}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@600;700;800&display=swap');
        .font-tech { font-family: 'Space Grotesk', sans-serif; }
        
        .shadow-ticket-dark {
            filter: drop-shadow(0 20px 35px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 25px rgba(229, 9, 20, 0.25));
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), filter 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .shadow-ticket-dark:hover {
            transform: translateY(-6px);
            filter: drop-shadow(0 30px 45px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 45px rgba(229, 9, 20, 0.45));
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

        .dark-ticket-bg {
            background: #0A0A0F !important;
            background: linear-gradient(165deg, #0A0A0F 0%, #15151F 50%, #1F1520 100%) !important;
        }

        .bg-mesh-dark {
            background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
            background-size: 16px 16px;
        }

        .bg-watermark-dark {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='210' height='110' viewBox='0 0 210 110'%3E%3Ctext x='15' y='65' fill='%23ffffff' fill-opacity='0.03' font-family='Inter, sans-serif' font-weight='900' font-size='24' transform='rotate(-25 105 55)'%3ERAPLOFILM%3C/text%3E%3C/svg%3E");
        }

        .card-3d-dark {
            background: linear-gradient(145deg, #181824 0%, #0d0d14 100%);
            box-shadow: 
                0 12px 22px -4px rgba(0, 0, 0, 0.6), 
                0 4px 8px -2px rgba(0, 0, 0, 0.4),
                inset 0 1px 2px rgba(255, 255, 255, 0.08),
                inset 0 -2px 4px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .card-3d-dark:hover {
            transform: translateY(-2px);
            box-shadow: 
                0 16px 26px -4px rgba(0, 0, 0, 0.8), 
                0 6px 12px -2px rgba(229, 9, 20, 0.2),
                inset 0 1px 2px rgba(255, 255, 255, 0.12);
        }

        .inner-inset-dark {
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8), 0 1px 0 rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(0, 0, 0, 0.8);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .title-3d-dark {
            color: #ffffff;
            text-shadow: 
                0 1px 0 #cccccc, 
                0 2px 0 #a3a3a3, 
                0 3px 0 #7a7a7a, 
                0 4px 8px rgba(0, 0, 0, 0.8), 
                0 0 18px rgba(229, 9, 20, 0.5);
            letter-spacing: 0.05em;
        }
      `}</style>

            {/* TICKET CARD DARK CONTAINER */}
            <div className="membership-ticket-surface w-full rounded-3xl dark-ticket-bg bg-mesh-dark text-slate-100 ticket-cutout shadow-ticket-dark overflow-hidden flex flex-col justify-between relative min-h-[580px] bg-[#0A0A0F]">

                {/* Atmospheric Background Glow Elements */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#e61a27]/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-10 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Watermark Overlay Dark */}
                <div className="absolute inset-0 bg-watermark-dark pointer-events-none z-0"></div>

                {/* Ticket Top Header Shield */}
                <div className="bg-slate-900/90 backdrop-blur-md p-5 text-center relative ticket-header-cut border-b border-slate-800">
                    <h2 className="text-2xl font-black text-white font-tech tracking-widest uppercase flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[#e61a27] text-[22px]">confirmation_number</span>
                        RAPLOFILM
                    </h2>
                    <p className="text-[10px] font-black text-[#e61a27] uppercase tracking-wider mt-1">HỆ THỐNG TRỰC TUYẾN E-TICKET</p>
                    <span className="membership-ticket-tier mt-2 inline-flex rounded-full border px-3 py-1 text-[9px] font-black tracking-[0.18em]">
                        {membershipTier.name}
                    </span>
                    <div className="w-12 h-1 bg-gradient-to-r from-red-600 to-[#e61a27] mx-auto mt-3 rounded-full"></div>
                </div>

                {/* Ticket Main Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 relative z-10 bg-black/20">

                    {/* Category Badge & Movie Title */}
                    <div className="space-y-2 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e61a27]/10 text-[#e61a27] border border-[#e61a27]/30 text-[10px] font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(229,9,20,0.2)]">
                            <span className="material-symbols-outlined text-[12px] animate-pulse">satellite_alt</span>
                            PHIM TRỰC TUYẾN
                        </span>
                        <h3 className="text-[26px] font-black uppercase font-tech leading-tight pt-1 title-3d-dark transform -rotate-1 line-clamp-2">
                            {ticket?.movie?.replace(/^RAP\s*LOFILM\s*[-|:]?\s*/i, '')}
                        </h3>
                    </div>

                    {/* Information Grid Block 1: Date & Format */}
                    <div className="grid grid-cols-2 gap-3 card-3d-dark rounded-2xl p-4 text-left">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">NGÀY CHIẾU</span>
                            <span className="text-[15px] font-extrabold text-white">{ticket?.date}</span>
                        </div>
                        <div className="border-l border-slate-700/50 pl-3 text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">ĐỊNH DẠNG</span>
                            <span className="text-[15px] font-extrabold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">4K UHD HDR</span>
                        </div>
                    </div>

                    {/* VIP Access Code Block */}
                    <div className="card-3d-dark rounded-2xl p-4 text-center group cursor-pointer relative overflow-hidden" onClick={() => {
                        navigator.clipboard.writeText(ticket?.id);
                        // Optionally add a small toast here
                    }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">MÃ TRUY CẬP VIP</span>
                        <div className="flex justify-center items-center gap-2">
                            <span className="font-tech text-2xl font-black tracking-widest text-white group-hover:text-[#e61a27] transition-colors">{ticket?.id}</span>
                            <span className="material-symbols-outlined text-slate-600 group-hover:text-[#e61a27] text-[16px] transition-colors">content_copy</span>
                        </div>
                    </div>

                    {/* Success Message */}
                    {showSuccessMessage && (
                        <div className="w-full flex justify-center z-20 relative pt-1">
                            <div className="bg-black/60 border border-emerald-500/50 px-4 py-1.5 rounded-full flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.3)] backdrop-blur-sm">
                                <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Giao dịch thành công</span>
                            </div>
                        </div>
                    )}

                    {/* QR Code Container */}
                    {isCodeVisible && (
                        <div className="w-full flex flex-col items-center justify-center mt-2 pb-2 transition-all duration-300">
                            <div className="bg-white p-3 rounded-xl border border-slate-700 shadow-[0_0_20px_rgba(229,9,20,0.3)] mb-2 relative">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent"></div>
                                <QRCodeSVG
                                    value={`${window.location.origin}/scan/online/${ticket?.id || 'N/A'}`}
                                    size={150}
                                    level="Q"
                                    includeMargin={false}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">MÃ: {ticket?.id}</span>
                        </div>
                    )}

                    {/* Perforated Line Accent */}
                    <div className="relative py-1 border-t border-b border-dashed border-slate-700/60 text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                            PHÒNG CHIẾU ĐÃ SẴN SÀNG
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button onClick={() => setIsCodeVisible(!isCodeVisible)} className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] uppercase flex items-center justify-center space-x-1.5 transition border border-slate-700 shadow-md">
                            <span className="material-symbols-outlined text-[16px] text-slate-400">{isCodeVisible ? 'visibility_off' : 'qr_code_scanner'}</span>
                            <span>{isCodeVisible ? 'ẨN MÃ QR' : 'HIỂN THỊ MÃ'}</span>
                        </button>
                        <button onClick={onPlay} className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-[#e61a27] to-red-700 hover:from-red-600 hover:to-red-800 text-white font-black text-[11px] uppercase flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(229,9,20,0.4)] transition">
                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                            <span>XEM PHIM NGAY</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
