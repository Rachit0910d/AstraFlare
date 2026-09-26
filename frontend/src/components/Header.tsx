import { useState } from 'react';
import { Fire, List, X, Broadcast } from '@phosphor-icons/react';

const NAV_LINKS = ['Home', 'Live Map', 'Predictive Analysis', 'Analytics', 'Report', 'Alert'];

interface HeaderProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
  onSearchSelect?: (location: { name: string; lat: number; lng: number }) => void;
}

export default function Header({
  activePage = 'Live Map',
  onNavigate,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (page: string) => {
    setIsMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
      <div className="px-6 sm:px-8 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => handleNavigate('Home')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none"
        >
          <div className="w-[34px] h-[34px] bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
            <Fire size={17} weight="fill" className="text-white" />
          </div>
          <div className="leading-none">
            <p className="text-2xl font-bold tracking-tight text-gray-900">
              Astra <span className="text-orange-500">Flare</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-[2px]">
              From Space to a Safer Earth
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {NAV_LINKS.map((link) => {
            const isActive = activePage === link;
            return (
              <button
                key={link}
                onClick={() => handleNavigate(link)}
                className={`text-[13.5px] px-3.5 py-1.5 rounded-full transition-all cursor-pointer relative ${
                  isActive
                    ? 'font-bold text-orange-600 bg-orange-50 border border-orange-200/80 shadow-xs'
                    : 'font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-transparent'
                }`}
              >
                <span>{link}</span>
              </button>
            );
          })}
        </nav>


        {/* Mobile Hamburger Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="w-10 h-10 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? (
              <X size={22} weight="bold" className="text-orange-600" />
            ) : (
              <List size={22} weight="bold" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/98 backdrop-blur-md shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="px-6 py-4 flex flex-col gap-1.5">
            <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-3">
              Navigation
            </div>
            {NAV_LINKS.map((link) => {
              const isActive = activePage === link;
              return (
                <button
                  key={link}
                  onClick={() => handleNavigate(link)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[14px] flex items-center justify-between transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 font-bold border border-orange-200/70'
                      : 'text-gray-700 hover:bg-gray-50 font-medium'
                  }`}
                >
                  <span>{link}</span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                  )}
                </button>
              );
            })}

            {/* Mobile Footer Status */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between px-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <Broadcast size={13} className="text-emerald-500 animate-pulse" />
                <span>Pan-India Telemetry Ingest</span>
              </span>
              <span className="font-semibold text-gray-400">AstraFlare v2.4</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
