import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useToastStore } from '../../store/toastStore';

const TOAST_DURATION_MS = 3000;

function getToastMeta(type) {
  if (type === 'success') {
    return {
      icon: 'check',
      iconClass: 'bg-emerald-500 text-white',
      title: 'Thành công',
      progressClass: 'bg-emerald-400',
    };
  }
  if (type === 'info') {
    return {
      icon: 'info',
      iconClass: 'bg-blue-500 text-white',
      title: 'Thông báo',
      progressClass: 'bg-blue-400',
    };
  }

  return {
    icon: 'priority_high',
    iconClass: 'bg-red-500 text-white',
    title: 'Lỗi',
    progressClass: 'bg-red-400',
  };
}

export default function AuthToast() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const location = useLocation();

  if (toasts.length === 0) return null;

  const isCenterMode = location.pathname.includes('/forgot-password');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const portalTarget = isCenterMode ? document.getElementById('forgot-password-card') : null;

  const defaultPosition = isAuthPage ? 'fixed right-4 top-4 items-end z-[9999]' : 'fixed right-4 top-24 items-end z-[9999]';

  const toastContent = (
    <div className={`pointer-events-none flex flex-col gap-3 ${
      isCenterMode && portalTarget ? 'absolute left-1/2 -translate-x-1/2 top-6 items-center z-[9999]' : defaultPosition
    }`}>
      {toasts.map((toast) => {
        const meta = getToastMeta(toast.type);

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-white/12 bg-[#161616]/95 p-3.5 text-white shadow-xl backdrop-blur-xl will-change-transform max-w-[500px] w-fit ${
              isCenterMode && portalTarget
                ? 'animate-[toast-slide-down_300ms_ease-out]'
                : 'animate-[toast-slide-in-right_300ms_ease-out]'
            }`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
              </div>

              <div className="min-w-0 flex-1 font-sans mt-0.5">
                <h3 className="text-[14px] font-semibold text-white tracking-wide">{meta.title}</h3>
                <p className="mt-1 text-[13px] text-white/70 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-full p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => removeToast(toast.id)}
                aria-label="Đóng thông báo"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            
            <div className="absolute bottom-0 left-0 h-1 w-full bg-black/50">
              <div
                className={`h-full ${meta.progressClass}`}
                style={{ width: '100%', animation: `toast-progress ${toast.duration || TOAST_DURATION_MS}ms linear forwards` }}
              />
            </div>
          </div>
        );
      })}

      <style>
        {`@keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }

        @keyframes toast-slide-in-right {
          0% {
            transform: translate3d(32px, 0, 0) scale(0.96);
            opacity: 0;
            filter: blur(6px);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes toast-slide-down {
          0% {
            transform: translate3d(0, -32px, 0) scale(0.96);
            opacity: 0;
            filter: blur(6px);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
            filter: blur(0);
          }
        }`}
      </style>
    </div>
  );

  if (isCenterMode && portalTarget) {
    return createPortal(toastContent, portalTarget);
  }

  return toastContent;
}
