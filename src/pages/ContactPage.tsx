import React, { useState } from 'react';
import { PageId } from '../types';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  MessageSquare,
  Clock,
  HelpCircle
} from 'lucide-react';

interface ContactPageProps {
  onNavigate: (page: PageId) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('seller');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
            🍓 Fast Creator Support
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Get in Touch With Us
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
            Have a question about your product listing, affiliate payouts, or refund guarantee? We are here to help.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Info Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#140b33] rounded-3xl p-8 border border-purple-800/60 shadow-xl space-y-6">
              <h3 className="text-xl font-bold text-white">
                Contact Channels
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold">Email Us Directly</span>
                    <a href="mailto:support@clickbarry.com" className="text-sm font-bold text-white hover:text-pink-400">
                      support@clickbarry.com
                    </a>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Average response time: &lt; 4 hours</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold">Telegram Creator Community</span>
                    <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-emerald-400">
                      @ClickBarryCreators
                    </a>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Live peer support & announcements</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold">Registered Office</span>
                    <p className="text-sm font-bold text-white">
                      ClickBarry Digital Technologies Pvt Ltd
                    </p>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Indiranagar 100ft Road, Bengaluru, Karnataka, India</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold">Support Hours</span>
                    <p className="text-sm font-bold text-white">
                      Monday – Saturday (9:00 AM – 8:00 PM IST)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Guarantee Link */}
            <div className="bg-[#180f3c] rounded-2xl p-6 border border-purple-900/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-pink-400">Need a quick refund?</span>
                <p className="text-xs text-slate-300">File under our 30-day / 5-sales policy</p>
              </div>
              <button
                onClick={() => onNavigate('guarantee')}
                className="px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs cursor-pointer"
              >
                Guarantee Form
              </button>
            </div>
          </div>

          {/* Right Message Form */}
          <div className="lg:col-span-7 bg-[#140b33] rounded-3xl p-8 sm:p-10 border border-purple-800/60 shadow-xl">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Message Sent Successfully!</h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Thank you, {name}! Your query ticket <strong>#CB-SPT-{Math.floor(1000 + Math.random() * 9000)}</strong> has been opened. Our support executive will get back to {email} shortly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                    setSubject('');
                  }}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-2">Send us a Message</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Rajesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Topic / Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                    >
                      <option value="seller">Seller Account (₹999 Access)</option>
                      <option value="affiliate">Affiliate Payouts & Links</option>
                      <option value="buyer">Product Download Issue</option>
                      <option value="guarantee">Refund Guarantee Claim</option>
                      <option value="partnership">Brand Partnership</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Brief headline of your query"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write your question or feedback in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message to ClickBarry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
