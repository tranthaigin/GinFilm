
import { X as CloseIcon, Check, X } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';

const TOAST_DURATION_MS = 4000; // Match the default duration

function getToastMeta(type) {
  if (type === 'success') {
    return {
      icon: <Check size={18} strokeWidth={3} />,
      iconClass: 'bg-emerald-500 text-white',
      title: 'Thành công',
      progressClass: 'bg-emerald-400',
    };
  }
  if (type === 'info') {
    return {
      icon: <Check size={18} strokeWidth={3} />,
      iconClass: 'bg-blue-500 text-white',
      title: 'Thông báo',
      progressClass: 'bg-blue-400',
    };
  }

  return {
    icon: <X size={18} strokeWidth={3} />,
    iconClass: 'bg-red-500 text-white',
    title: 'Thất bại',
    progressClass: 'bg-red-400',
  };
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-24 items-end z-[9999] pointer-events-none flex flex-col gap-3">
      {toasts.map((toast) => {
        const meta = getToastMeta(toast.type);

        return (
          <div
            key={toast.id}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-white/12 bg-[#161616]/95 p-3.5 text-white shadow-xl backdrop-blur-xl will-change-transform max-w-[500px] w-fit animate-[toast-slide-in-right_300ms_ease-out]"
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.iconClass}`}>
                {meta.icon}
              </div>

              <div className="min-w-0 flex-1 font-sans mt-0.5 pr-4">
                <h3 className="text-[14px] font-semibold tracking-wide" style={{ color: '#ffffff' }}>{meta.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/10"
                onClick={() => removeToast(toast.id)}
                aria-label="Đóng thông báo"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <CloseIcon size={16} />
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
        }`}
      </style>
    </div>
  );
}
