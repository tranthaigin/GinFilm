import { Link } from 'react-router-dom';
import { LOGO_URL } from '../../../../shared/constants/brand';

export default function BrandLogo({ className = '', onClick, to = '/', variant = 'default' }) {
  const isLarge = variant === 'auth';
  const image = (
    <div className={`flex items-center shrink-0 select-none pointer-events-none ${isLarge ? 'gap-5' : 'gap-2 md:gap-4'}`}>
      <img
        alt="GinFilm Icon"
        className={`${className || (isLarge ? 'h-16' : 'h-9 md:h-12')} w-auto max-w-none shrink-0 object-contain pointer-events-none`}
        height="192"
        draggable="false"
        src={LOGO_URL}
        width="192"
      />
      <div className={`flex select-none items-center leading-none font-['Inter'] pointer-events-none ${isLarge ? 'gap-0.5' : ''}`}>
        <span className={`${isLarge ? 'text-[2rem]' : 'text-[18px] md:text-2xl'} font-black tracking-[0.12em] text-[#111827] dark:text-white transition-colors duration-300`}>GIN</span>
        <span className={`${isLarge ? 'text-[2rem]' : 'text-[18px] md:text-2xl'} font-black tracking-[0.12em] text-[#dc2626] transition-colors duration-300`}>FILM</span>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link className="flex-none inline-flex items-center overflow-visible outline-none focus:outline-none select-none" onClick={onClick} to={to}>
        {image}
      </Link>
    );
  }

  return image;
}
