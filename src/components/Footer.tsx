import React from 'react';
import { StrawberryLogo } from './StrawberryLogo';
import { PageId } from '../types';
import { useAuth } from '../context/AuthContext';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  return (
    <footer className="relative w-full bg-[#0a0518] border-t border-purple-900/50 text-slate-300 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_20px_rgba(236,72,153,0.9)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-purple-900/40">
          <div className="shrink-0">
            <StrawberryLogo size="md" showTagline={true} onClick={() => onNavigate('home')} />
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-300 font-medium">
            <button onClick={() => onNavigate('home')} className="hover:text-pink-400 transition-colors cursor-pointer">
              Home
            </button>
            {user && (
              <>
                <span className="text-purple-700 select-none">|</span>
                <button onClick={() => onNavigate('marketplace')} className="hover:text-pink-400 transition-colors cursor-pointer">
                  Marketplace
                </button>
              </>
            )}
            <span className="text-purple-700 select-none">|</span>
            <button onClick={() => onNavigate('affiliate')} className="hover:text-pink-400 transition-colors cursor-pointer">
              Affiliate
            </button>
            <span className="text-purple-700 select-none">|</span>
            <button onClick={() => onNavigate('seller')} className="hover:text-pink-400 transition-colors cursor-pointer">
              Seller
            </button>
            <span className="text-purple-700 select-none">|</span>
            <button onClick={() => onNavigate('how-it-works')} className="hover:text-pink-400 transition-colors cursor-pointer">
              How It Works
            </button>
            {user && (
              <>
                <span className="text-purple-700 select-none">|</span>
                <button onClick={() => onNavigate('directory')} className="hover:text-pink-400 transition-colors cursor-pointer">
                  Directory
                </button>
              </>
            )}
            <span className="text-purple-700 select-none">|</span>
            <button onClick={() => onNavigate('guarantee')} className="hover:text-pink-400 transition-colors cursor-pointer">
              Guarantee
            </button>
            <span className="text-purple-700 select-none">|</span>
            <button onClick={() => onNavigate('about')} className="hover:text-pink-400 transition-colors cursor-pointer">
              About Us
            </button>
            <span className="text-purple-700 select-none">|</span>
            <button onClick={() => onNavigate('contact')} className="hover:text-pink-400 transition-colors cursor-pointer">
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white flex items-center justify-center transition-transform hover:scale-110 shadow-md"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="w-9 h-9 rounded-full bg-[#FF0000] hover:bg-[#e60000] text-white flex items-center justify-center transition-transform hover:scale-110 shadow-md"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="w-9 h-9 rounded-full bg-[#229ED9] hover:bg-[#1e8ec3] text-white flex items-center justify-center transition-transform hover:scale-110 shadow-md"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.832.921z" />
              </svg>
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
              className="w-9 h-9 rounded-full bg-black hover:bg-slate-900 border border-slate-700 text-white flex items-center justify-center transition-transform hover:scale-110 shadow-md"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-9 h-9 rounded-full bg-[#0077B5] hover:bg-[#00669c] text-white flex items-center justify-center transition-transform hover:scale-110 shadow-md"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© 2026 ClickBarry. All Rights Reserved.</p>
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <span className="text-emerald-400">●</span>
            <span>Secure</span>
            <span>•</span>
            <span className="text-pink-400">●</span>
            <span>Reliable</span>
            <span>•</span>
            <span className="text-amber-400">●</span>
            <span>Trusted</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
