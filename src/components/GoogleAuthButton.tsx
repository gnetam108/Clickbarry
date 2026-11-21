import React from 'react';
import { RefreshCw } from 'lucide-react';

interface GoogleAuthButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  showDivider?: boolean;
  dividerText?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  label = 'Continue with Google',
  showDivider = true,
  dividerText = 'or continue with email'
}) => {
  return (
    <div className="space-y-3.5">
      <button
        type="button"
        onClick={onClick}
        disabled={loading || disabled}
        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm border border-slate-200 shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>

      {showDivider && (
        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-purple-800/70" />
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            {dividerText}
          </span>
          <div className="flex-grow border-t border-purple-800/70" />
        </div>
      )}
    </div>
  );
};
