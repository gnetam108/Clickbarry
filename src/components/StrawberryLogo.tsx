import React from 'react';

interface StrawberryLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  onClick?: () => void;
}

export const StrawberryLogo: React.FC<StrawberryLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = true,
  onClick
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  }[size];

  const brandTextSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl sm:text-4xl'
  }[size];

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs sm:text-sm'
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* 3D Strawberry Icon */}
      <div className={`relative ${iconDimensions} shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(255,27,107,0.5)]">
          <defs>
            <radialGradient id="strawberryGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ff4d79" />
              <stop offset="45%" stopColor="#e6004c" />
              <stop offset="85%" stopColor="#b3003b" />
              <stop offset="100%" stopColor="#730026" />
            </radialGradient>
            <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <filter id="berryGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ff1b6b" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Strawberry Body */}
          <path
            d="M50 94C38 88 16 66 16 42C16 28 26 18 42 20C47 21 49 24 50 24C51 24 53 21 58 20C74 18 84 28 84 42C84 66 62 88 50 94Z"
            fill="url(#strawberryGrad)"
            filter="url(#berryGlow)"
          />

          {/* Seeds / Gold Speckles */}
          <g fill="#ffe082" opacity="0.9">
            <ellipse cx="34" cy="38" rx="1.8" ry="2.8" transform="rotate(-15 34 38)" />
            <ellipse cx="48" cy="36" rx="1.8" ry="2.8" />
            <ellipse cx="64" cy="40" rx="1.8" ry="2.8" transform="rotate(15 64 40)" />
            <ellipse cx="26" cy="52" rx="1.8" ry="2.8" transform="rotate(-20 26 52)" />
            <ellipse cx="40" cy="50" rx="1.8" ry="2.8" transform="rotate(-8 40 50)" />
            <ellipse cx="58" cy="52" rx="1.8" ry="2.8" transform="rotate(10 58 52)" />
            <ellipse cx="72" cy="54" rx="1.8" ry="2.8" transform="rotate(22 72 54)" />
            <ellipse cx="35" cy="68" rx="1.6" ry="2.5" transform="rotate(-12 35 68)" />
            <ellipse cx="50" cy="68" rx="1.6" ry="2.5" />
            <ellipse cx="65" cy="68" rx="1.6" ry="2.5" transform="rotate(15 65 68)" />
            <ellipse cx="44" cy="80" rx="1.4" ry="2.2" transform="rotate(-5 44 80)" />
            <ellipse cx="55" cy="80" rx="1.4" ry="2.2" transform="rotate(8 55 80)" />
          </g>

          {/* Calyx & Green Leaves */}
          <path
            d="M50 20C46 14 38 12 30 16C36 19 40 22 44 24C34 22 24 24 18 30C24 30 32 29 42 27C34 32 30 38 28 44C34 40 42 35 46 29C48 31 52 31 54 29C58 35 66 40 72 44C70 38 66 32 58 27C68 29 76 30 82 30C76 24 66 22 56 24C60 22 64 19 70 16C62 12 54 14 50 20Z"
            fill="url(#leafGrad)"
          />
          {/* Stem */}
          <path
            d="M50 19C49 14 47 9 44 6C47 6 52 8 53 14L50 19Z"
            fill="#4d7c0f"
          />
        </svg>
      </div>

      {/* Brand Text & Tagline */}
      <div className="flex flex-col text-left">
        <div className={`font-display font-extrabold tracking-tight leading-none ${brandTextSizes}`}>
          <span className="text-white">Click</span>
          <span className="bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 bg-clip-text text-transparent">
            Barry
          </span>
        </div>
        {showTagline && (
          <span className={`text-slate-300 font-medium tracking-normal mt-0.5 leading-none ${taglineSizes}`}>
            Your Product. Your Business.
          </span>
        )}
      </div>
    </div>
  );
};
