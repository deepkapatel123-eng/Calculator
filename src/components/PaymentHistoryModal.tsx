import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  Search,
  Download,
  Share2,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Trash2,
} from 'lucide-react';
import { PaymentTransaction } from '../types';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: PaymentTransaction[];
  onClearHistory: () => void;
  isLight?: boolean;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  payments,
  onClearHistory,
  isLight = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today'>('today');

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Date filter
      if (filterPeriod === 'today') {
        const pDate = new Date(p.timestamp).toDateString();
        const todayDate = new Date().toDateString();
        if (pDate !== todayDate) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.customerName?.toLowerCase().includes(q);
        const matchesUtr = p.utr?.toLowerCase().includes(q);
        const matchesAmt = p.amount.toString().includes(q);
        const matchesNote = p.note?.toLowerCase().includes(q);
        return matchesName || matchesUtr || matchesAmt || matchesNote;
      }
      return true;
    });
  }, [payments, searchQuery, filterPeriod]);

  // Today's total and Overall total
  const todayTotal = useMemo(() => {
    const todayDate = new Date().toDateString();
    return payments
      .filter((p) => new Date(p.timestamp).toDateString() === todayDate && p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const allTimeTotal = useMemo(() => {
    return payments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const handleShareReceipt = (p: PaymentTransaction) => {
    const text = `🧾 *Google Pay Payment Receipt / પહોંચ*\n\n` +
      `🏬 દુકાન: *${p.payeeName || 'Merchant'}*\n` +
      `💰 જમા રકમ: *₹${p.amount.toFixed(2)}*\n` +
      `👤 ગ્રાહક: *${p.customerName}*\n` +
      `🆔 UPI Ref (UTR): *${p.utr}*\n` +
      `📅 સમય: *${new Date(p.timestamp).toLocaleString('gu-IN')}*\n` +
      `✅ સ્ટેટસ: *સફળ (PAID)*\n\n` +
      `_Google Pay for Business દ્વારા ચુકવણી પ્રાપ્ત થઈ._`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1f2937] px-4 py-3.5 text-white flex items-center justify-between border-b border-stone-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-xs text-white">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>જમા થયેલા પેમેન્ટ્સ (Payments)</span>
              </h2>
              <p className="text-[11px] text-stone-300">
                Google Pay Business Collection Log
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collection Summary Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-100 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>આજનું કુલ કલેક્શન (Today's Total)</span>
              </span>
              <div className="text-2xl font-black tracking-tight mt-0.5">
                ₹{todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-emerald-200">કુલ ટ્રાન્ઝેક્શન</span>
              <div className="text-lg font-bold">
                {payments.filter((p) => p.status === 'SUCCESS').length} વ્યવહાર
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-stone-200 bg-stone-50 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="નામ, UTR અથવા રકમ શોધો..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center bg-stone-200 rounded-lg p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setFilterPeriod('today')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterPeriod === 'today'
                    ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                આજે
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriod('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterPeriod === 'all'
                    ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                તમામ ({allTimeTotal > 0 ? `₹${allTimeTotal.toFixed(0)}` : '0'})
              </button>
            </div>
          </div>
        </div>

        {/* List of Payments */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-10 text-stone-500">
              <Receipt className="w-10 h-10 mx-auto text-stone-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold">હજુ સુધી કોઈ પેમેન્ટ મળ્યું નથી</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                QR કોડ સ્કેન કરી ગ્રાહક પેમેન્ટ કરશે એટલે અહીં યાદી દેખાશે.
              </p>
            </div>
          ) : (
            filteredPayments.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col gap-1.5 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        {p.customerName || 'Google Pay Customer'}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        UTR: {p.utr}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-700">
                      +₹{p.amount.toFixed(2)}
                    </div>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold inline-block">
                      SUCCESS
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px] text-stone-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    <span>
                      {new Date(p.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      , {new Date(p.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShareReceipt(p)}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                      title="Share WhatsApp Receipt"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>પહોંચ (Receipt)</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {payments.length > 0 && (
          <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm('શું તમે તમામ પેમેન્ટ્સ રેકોર્ડ સાફ કરવા માંગો છો?')) {
                  onClearHistory();
                }
              }}
              className="text-stone-500 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>હિસ્ટ્રી સાફ કરો</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold shadow-xs"
            >
              બંધ કરો
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
