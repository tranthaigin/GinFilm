import { Link } from 'react-router-dom';
import { HERO_BG_URL } from '../../../../shared/constants/brand';
import BrandLogo from '../layout/BrandLogo';

export default function BookingHeader() {
  return (
    <header className="bg-background/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)] sticky top-0 w-full z-50">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        <BrandLogo className="h-10" />

        <nav className="hidden md:flex gap-8 items-center">
          <div className="group relative">
            <a
              className="font-label-caps text-label-caps text-text-default hover:text-text-strong transition-colors duration-200 hover:bg-surface-alt/50 px-3 py-2 rounded-md flex items-center gap-1 cursor-pointer"
              href="#"
            >
              Movies
              <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-180">
                expand_more
              </span>
            </a>

            <div className="fixed top-full left-0 w-full backdrop-blur-md border-b border-surface-alt shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 bg-surface-container-lowest">
              <div className="max-w-container-max mx-auto px-margin-desktop py-12 flex justify-between gap-12">
                {[
                  {
                    title: 'Genres',
                    links: ['Action', 'Sci-Fi', 'Horror', 'Comedy', 'Drama'],
                  },
                  {
                    title: 'Formats',
                    links: ['IMAX', '4DX', 'ScreenX', 'Gold Class'],
                  },
                  {
                    title: 'Collections',
                    links: ['Award Winners', 'Top Trending', 'Vietnamese Cinema'],
                  },
                  {
                    title: 'Quick Links',
                    links: ['Coming Soon', 'Box Office', 'Gift Cards'],
                  },
                ].map((col) => (
                  <div key={col.title} className="flex-1">
                    <h4 className="font-label-caps text-text-strong mb-6 border-b border-surface-alt pb-2 uppercase tracking-wider">
                      {col.title}
                    </h4>
                    <ul className="flex flex-col gap-3">
                      {col.links.map((link) => (
                        <li key={link}>
                          <a
                            className="text-text-muted hover:text-primary text-sm transition-colors"
                            href="#"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="w-[320px] shrink-0">
                  <h4 className="font-label-caps text-text-strong mb-6 border-b border-surface-alt pb-2 uppercase tracking-wider">
                    Featured
                  </h4>
                  <div className="relative rounded-lg overflow-hidden aspect-video group/card shadow-lg">
                    <img
                      alt="Neon Horizon"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                      src={HERO_BG_URL}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent flex flex-col justify-end p-4">
                      <h5 className="text-text-strong font-bold text-sm">Neon Horizon</h5>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                        NOW SHOWING
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <a
            className="font-label-caps text-label-caps text-text-default hover:text-text-strong transition-colors duration-200 hover:bg-surface-alt/50 px-3 py-2 rounded-md"
            href="#"
          >
            Cinemas
          </a>
          <a
            className="font-label-caps text-label-caps text-text-default hover:text-text-strong transition-colors duration-200 hover:bg-surface-alt/50 px-3 py-2 rounded-md"
            href="#"
          >
            Offers
          </a>
          <Link
            className="font-label-caps text-label-caps text-primary border-b-2 border-primary pb-1 font-bold px-3 py-2 rounded-md"
            to="/booking"
          >
            Booking
          </Link>
        </nav>

        <div className="flex items-center gap-6">
          <button type="button" className="text-text-default hover:text-text-strong transition-colors duration-200">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button type="button" className="text-text-default hover:text-text-strong transition-colors duration-200">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <Link
            className="btn-primary text-sm tracking-wider px-6 py-2"
            to="/login"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
