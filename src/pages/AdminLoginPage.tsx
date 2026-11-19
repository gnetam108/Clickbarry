import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { useAuth } from '../context/AuthContext';
import { StrawberryLogo } from '../components/StrawberryLogo';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface AdminLoginPageProps {
  onNavigate: (page: PageId) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  const { user, isAdmin, signIn, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user && isAdmin) {
      onNavigate('admincore');
    }
  }, [user, isAdmin, onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.message || 'Authentication failed.');
      return;
    }

    if (res.role !== 'admin') {
      await signOut();
      setErrorMessage('Access denied. This account does not have Administrator privileges.');
      return;
    }

    onNavigate('admincore');
  };

  return (
    <div className="min-h-screen bg-[#090418] text-slate-100 py-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#120a2c] border border-purple-800/80 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block">
            <StrawberryLogo size="sm" showTagline={false} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-[11px] font-bold uppercase tracking-wider mx-auto">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Restricted Owner Portal</span>
          </div>
          <h1 className="text-2xl font-black text-white">Administrator Sign In</h1>
          <p className="text-xs text-slate-400">
            Authorized ClickBarry Administrators only. Non-admin accounts are automatically blocked.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/70 text-red-200 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="admin@clickbarry.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1044] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#1b1044] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Admin Access...</span>
              </>
            ) : (
              <>
                <span>Enter AdminCore</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
