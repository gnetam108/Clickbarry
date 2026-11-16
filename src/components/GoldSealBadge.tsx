import React from 'react';
import { Star } from 'lucide-react';

interface GoldSealBadgeProps {
  className?: string;
  onClick?: () => void;
}

export const GoldSealBadge: React.FC<GoldSealBadgeProps> = ({ className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-col items-center cursor-pointer group transition-transform duration-300 hover:scale-105 select-none ${className}`}
      role="button"
      tabIndex={0}
      title="Verified ClickBarry Seller Guarantee"
    >
      {/* Red Ribbon Tails at Bottom */}
      <div className="absolute -bottom-6 w-32 flex justify-between z-0 pointer-events-none">
        {/* Left Ribbon */}
        <div
          className="w-12 h-14 bg-gradient-to-b from-red-600 to-red-800 shadow-lg transform -rotate-25 origin-top-right"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)' }}
        />
        {/* Right Ribbon */}
        <div
          className="w-12 h-14 bg-gradient-to-b from-red-600 to-red-800 shadow-lg transform rotate-25 origin-top-left"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)' }}
        />
      </div>

      {/* Main Scalloped Golden Seal */}
      <div className="relative z-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full p-2.5 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-2xl flex items-center justify-center berry-glow-gold border-2 border-amber-300">
        {/* Scalloped decorative edge background */}
        <div className="absolute inset-1 rounded-full border border-dashed border-amber-800/40" />

        {/* Inner Golden Gradient Disc */}
        <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 flex flex-col items-center justify-center text-center p-3 text-slate-900 shadow-inner">
          <span className="text-[13px] sm:text-[14px] font-bold uppercase tracking-wide leading-tight text-slate-950">
            Grow
          </span>
          <span className="text-[14px] sm:text-[15px] font-extrabold uppercase tracking-tight text-slate-950 leading-tight">
            Your Business
          </span>
          <span className="text-[11px] font-semibold text-slate-800 mt-0.5">
            with
          </span>
          <span className="font-display text-[15px] sm:text-[17px] font-black tracking-tight text-slate-950 leading-tight mt-0.5">
            ClickBarry
          </span>

          {/* 5 Stars */}
          <div className="flex items-center gap-0.5 mt-1 text-slate-950">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
