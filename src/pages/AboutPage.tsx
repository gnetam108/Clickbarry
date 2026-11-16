import React from 'react';
import { PageId } from '../types';
import { StrawberryLogo } from '../components/StrawberryLogo';
import {
  Heart,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Users,
  Target,
  ArrowRight
} from 'lucide-react';

interface AboutPageProps {
  onNavigate: (page: PageId) => void;
  onOpenSignup: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onNavigate,
  onOpenSignup
}) => {
  const heroStrawberries = '/src/assets/images/hero_strawberries_1794019708249.jpg';

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="max-w-5xl mx-auto space-y-14">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
            🍓 Our Mission & Story
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            About ClickBarry
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
            Empowering the next generation of digital creators and affiliates with honest software and fruitful commerce.
          </p>
        </div>

        {/* Brand Origin & Strawberry Metaphor */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#140b33] rounded-3xl p-8 sm:p-12 border border-purple-800/60 shadow-2xl">
          <div className="md:col-span-7 space-y-4">
            <StrawberryLogo size="lg" showTagline={true} />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
              Why the Strawberry?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Strawberries represent freshness, vitality, and natural sweetness. In a digital world dominated by bloated platforms that squeeze creator margins and demand endless monthly subscriptions, ClickBarry was born as a fresh breath of air.
            </p>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Our creed is simple: <strong className="text-pink-400">Your Product. Your Business.</strong> You do the creative work; you deserve to keep your rightful reward.
            </p>
          </div>

          <div className="md:col-span-5 flex justify-center">
            <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl border border-pink-500/30">
              <img
                src={heroStrawberries}
                alt="ClickBarry Fresh Ripe Strawberries"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* 3 Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Zero Subscription Rent</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              We reject recurring monthly seller fees. Pay ₹999 once and build your business without rent anxiety.
            </p>
          </div>

          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Symbiotic Ecosystem</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connecting creators who produce great digital assets with ambitious marketers who know how to sell them.
            </p>
          </div>

          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Guaranteed Creator Security</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Our 5-sales / 1-month refund policy ensures you never risk your hard-earned money testing new product ideas.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="rounded-3xl bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-indigo-900/40 border border-pink-500/30 p-8 sm:p-10 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Join the ClickBarry Movement
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Become a part of India's fastest growing creator and affiliate ecosystem today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onOpenSignup}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-xl shadow-pink-600/40 cursor-pointer"
            >
              Start Selling for ₹999
            </button>
            <button
              onClick={() => onNavigate('marketplace')}
              className="px-6 py-3 rounded-full bg-[#1b1046] text-white font-semibold text-sm border border-purple-800 cursor-pointer"
            >
              Explore Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
