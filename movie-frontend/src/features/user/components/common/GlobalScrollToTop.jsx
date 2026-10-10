import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function GlobalScrollToTop() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
      );
      const scrolled = window.scrollY > 300;
      const isAtBottom = window.innerHeight + window.scrollY >= scrollHeight - 150;
      setShowScrollTop(scrolled && isAtBottom);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Do not render on the profile page
  if (location.pathname === '/profile') {
    return null;
  }

  const roleStr = user ? (typeof user.role === 'string' ? user.role.toUpperCase() :
                  Array.isArray(user.roles) ? user.roles.map(r => typeof r === 'string' ? r : (r.name || r.authority || '')).join(' ').toUpperCase() :
                  Array.isArray(user.authorities) ? user.authorities.map(a => a.authority || '').join(' ').toUpperCase() : '') : '';
  const hasChatWidget = isAuthenticated && user && !roleStr.includes('ADMIN') && !roleStr.includes('STAFF');

  return (
    <button 
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed ${hasChatWidget ? 'bottom-[100px] right-[37px]' : 'bottom-6 right-6'} z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#dc2626] text-white shadow-[0_4px_16px_rgba(220,38,38,0.5)] transition-all duration-300 hover:bg-[#b91c1c] ${showScrollTop ? 'translate-y-0 opacity-100 hover:scale-110' : 'translate-y-16 opacity-0 pointer-events-none'}`}
      aria-label="Cuộn lên đầu trang"
    >
      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"wght" 600' }}>arrow_upward</span>
    </button>
  );
}
