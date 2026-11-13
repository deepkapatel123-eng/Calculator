import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  RotateCcw,
  Copy,
  Check,
  MessageCircle,
  Banknote,
  Calculator as CalcIcon,
} from 'lucide-react';
import { formatIndianNumber } from '../utils/calculatorEngine';

interface CurrencyDenominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToCalculator: (totalAmount: string) => void;
  currentCalculatorAmount?: string;
  theme?: 'light' | 'dark';
}

interface DenominationItem {
  value: number;
  label: string;
  type: 'note' | 'coin';
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const DENOMINATIONS: DenominationItem[] = [
  {
    value: 2000,
    label: '₹2,000',
    type: 'note',
    badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/50',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    badgeBorder: 'border-fuchsia-200 dark:border-fuchsia-800',
  },
  {
    value: 500,
    label: '₹500',
    type: 'note',
    badgeBg: 'bg-stone-100 dark:bg-stone-800',
    badgeText: 'text-stone-700 dark:text-stone-200',
    badgeBorder: 'border-stone-300 dark:border-stone-600',
  },
  {
    value: 200,
    label: '₹200',
    type: 'note',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
  },
  {
    value: 100,
    label: '₹100',
    type: 'note',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/50',
    badgeText: 'text-violet-700 dark:text-violet-300',
    badgeBorder: 'border-violet-200 dark:border-violet-800',
  },
  {
    value: 50,
    label: '₹50',
    type: 'note',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    badgeBorder: 'border-cyan-200 dark:border-cyan-800',
  },
  {
    value: 20,
    label: '₹20',
    type: 'note',
    badgeBg: 'bg-lime-50 dark:bg-lime-950/50',
    badgeText: 'text-lime-700 dark:text-lime-300',
    badgeBorder: 'border-lime-300 dark:border-lime-800',
  },
  {
    value: 10,
    label: '₹10',
    type: 'note',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/50',
    badgeText: 'text-orange-800 dark:text-orange-300',
    badgeBorder: 'border-orange-200 dark:border-orange-800',
  },
  {
    value: 5,
    label: '₹5',
    type: 'coin',
    badgeBg: 'bg-yellow-50 dark:bg-yellow-950/40',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    badgeBorder: 'border-yellow-300 dark:border-yellow-700',
  },
  {
    value: 2,
    label: '₹2',
    type: 'coin',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-300 dark:border-slate-600',
  },
  {
    value: 1,
    label: '₹1',
    type: 'coin',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-600 dark:text-slate-300',
    badgeBorder: 'border-slate-300 dark:border-slate-600',
  },
];

const STORAGE_DENOM_KEY = 'indian_currency_denomination_counts_v1';

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one ? `${TENS[ten]} ${ONES[one]}` : TENS[ten];
}

function numberToIndianWords(num: number): string {
  if (!num || num <= 0 || !isFinite(num)) return 'Zero Rupees';
  const whole = Math.floor(num);
  if (whole === 0) return 'Zero Rupees';

  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const hundred = Math.floor((whole % 1000) / 100);
  const rest = whole % 100;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${crore < 100 ? twoDigitsToWords(crore) : formatIndianNumber(String(crore))} Crore`);
  if (lakh > 0) parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  if (hundred > 0) parts.push(`${ONES[hundred]} Hundred`);
  if (rest > 0) parts.push(twoDigitsToWords(rest));

  return `${parts.join(' ')} Rupees Only`;
}

export const CurrencyDenominationModal: React.FC<CurrencyDenominationModalProps> = ({
  isOpen,
  onClose,
  onApplyToCalculator,
  currentCalculatorAmount = '0',
  theme = 'light',
}) => {
  const isLight = theme === 'light';

  const [counts, setCounts] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DENOM_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [show2000, setShow2000] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DENOM_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return (parsed[2000] || 0) > 0;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DENOM_KEY, JSON.stringify(counts));
    } catch {
      // ignore
    }
  }, [counts]);

  const visibleDenominations = useMemo(() => {
    return DENOMINATIONS.filter((d) => d.value !== 2000 || show2000);
  }, [show2000]);

  const { grandTotal, totalNotes, totalCoins } = useMemo(() => {
    let total = 0;
    let notes = 0;
    let coins = 0;
    for (const d of DENOMINATIONS) {
      const qty = counts[d.value] || 0;
      if (qty > 0) {
        total += d.value * qty;
        if (d.type === 'note') notes += qty;
        else coins += qty;
      }
    }
    return { grandTotal: total, totalNotes: notes, totalCoins: coins };
  }, [counts]);

  const billAmountNum = useMemo(() => {
    const cleaned = currentCalculatorAmount.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed > 0 ? parsed : 0;
  }, [currentCalculatorAmount]);

  const updateCount = (denomValue: number, nextCount: number) => {
    const clamped = Math.max(0, Math.min(999999, Math.floor(nextCount || 0)));
    setCounts((prev) => {
      if (clamped === 0) {
        const copy = { ...prev };
        delete copy[denomValue];
        return copy;
      }
      return { ...prev, [denomValue]: clamped };
    });
  };

  const handleReset = () => {
    setCounts({});
    try {
      localStorage.removeItem(STORAGE_DENOM_KEY);
    } catch {
      // ignore
    }
  };

  const buildShareText = () => {
    const lines: string[] = [
      '💵 *ભારતીય ચલણી નોટ ગણતરી (Cash Denomination)*',
      `📅 ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
      '──────────────────',
    ];

    for (const d of DENOMINATIONS) {
      const qty = counts[d.value] || 0;
      if (qty > 0) {
        const sub = d.value * qty;
        lines.push(`${d.label} × ${qty} = ₹${formatIndianNumber(String(sub))}`);
      }
    }

    lines.push('──────────────────');
    lines.push(`💰 *કુલ રકમ: ₹${formatIndianNumber(String(grandTotal))}*`);
    lines.push(`🧾 નોટ: ${totalNotes} | સિક્કા: ${totalCoins}`);
    lines.push(`📝 _${numberToIndianWords(grandTotal)}_`);
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    if (grandTotal <= 0) return;
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    if (grandTotal <= 0) return;
    const text = buildShareText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      id="currency-denomination-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="currency-denomination-dialog"
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border ${
          isLight ? 'bg-white text-stone-900 border-stone-200' : 'bg-[#141416] text-white border-stone-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 flex items-center justify-between border-b shrink-0 ${
            isLight ? 'bg-white border-stone-200' : 'bg-[#1a1a1d] border-stone-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                ચલણી નોટ ગણતરી (Cash Counter)
              </h2>
              <p className={`text-[11px] leading-tight mt-0.5 ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                Indian Rupee Notes &amp; Coins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShow2000((v) => !v)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                show2000
                  ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                  : isLight
                  ? 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
              title="Toggle ₹2000 note row"
            >
              {show2000 ? '₹2000 ✓' : '+ ₹2000'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isLight ? 'text-stone-500 hover:bg-stone-100' : 'text-stone-400 hover:bg-stone-800'
              }`}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Total Banner */}
        <div
          className={`px-4 py-3 border-b shrink-0 ${
            isLight
              ? 'bg-emerald-50/90 border-emerald-200/80'
              : 'bg-emerald-950/35 border-emerald-900/50'
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  isLight ? 'text-emerald-800' : 'text-emerald-300'
                }`}
              >
                કુલ રોકડ (Total Cash)
              </span>
              <div
                className={`text-3xl font-extrabold tracking-tight leading-none mt-1 ${
                  isLight ? 'text-emerald-700' : 'text-emerald-400'
                }`}
              >
                ₹{formatIndianNumber(String(grandTotal))}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isLight ? 'bg-white text-stone-700 border border-emerald-200' : 'bg-stone-900 text-stone-200 border border-stone-700'
                }`}
              >
                <span>નોટ: {totalNotes}</span>
                <span className="opacity-40">|</span>
                <span>સિક્કા: {totalCoins}</span>
              </div>
            </div>
          </div>

          <p
            className={`text-[11px] font-medium mt-1.5 truncate ${
              isLight ? 'text-emerald-800/80' : 'text-emerald-300/80'
            }`}
            title={numberToIndianWords(grandTotal)}
          >
            {numberToIndianWords(grandTotal)}
          </p>

          {/* Bill comparison strip when calculator already has a bill amount */}
          {billAmountNum > 0 && grandTotal > 0 && (
            <div
              className={`mt-2 pt-2 border-t flex items-center justify-between text-xs font-semibold ${
                isLight ? 'border-emerald-200/80 text-stone-700' : 'border-emerald-900/50 text-stone-200'
              }`}
            >
              <span>બિલ: ₹{formatIndianNumber(String(billAmountNum))}</span>
              {grandTotal >= billAmountNum ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  પાછા આપવાના (Change): ₹{formatIndianNumber(String(Math.round((grandTotal - billAmountNum) * 100) / 100))}
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  ઘટ / બાકી (Short): ₹{formatIndianNumber(String(Math.round((billAmountNum - grandTotal) * 100) / 100))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Denomination Rows */}
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
          {visibleDenominations.map((denom) => {
            const qty = counts[denom.value] || 0;
            const subtotal = denom.value * qty;

            return (
              <div
                key={denom.value}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl border transition-colors ${
                  qty > 0
                    ? isLight
                      ? 'bg-emerald-50/40 border-emerald-300/80'
                      : 'bg-emerald-950/20 border-emerald-800/60'
                    : isLight
                    ? 'bg-stone-50/80 border-stone-200/80'
                    : 'bg-[#1d1d21] border-stone-800'
                }`}
              >
                {/* Left: Note / Coin Badge */}
                <div className="flex items-center gap-2 min-w-[82px]">
                  <div
                    className={`px-2 py-1.5 border font-extrabold text-xs sm:text-sm min-w-[66px] text-center shadow-2xs ${
                      denom.type === 'coin' ? 'rounded-full' : 'rounded-lg'
                    } ${denom.badgeBg} ${denom.badgeText} ${denom.badgeBorder}`}
                  >
                    {denom.label}
                  </div>
                </div>

                {/* Middle: - [input] + */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateCount(denom.value, qty - 1)}
                    disabled={qty <= 0}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all active:scale-90 disabled:opacity-35 ${
                      isLight
                        ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                        : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
                    }`}
                    aria-label={`Decrease ${denom.label}`}
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={qty === 0 ? '' : qty}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      updateCount(denom.value, raw === '' ? 0 : parseInt(raw, 10));
                    }}
                    placeholder="0"
                    className={`w-14 h-8 text-center font-bold text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900 placeholder:text-stone-300'
                        : 'bg-stone-900 border-stone-700 text-white placeholder:text-stone-600'
                    }`}
                    aria-label={`Count for ${denom.label}`}
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(denom.value, qty + 1)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
                      isLight
                        ? 'bg-white border-stone-200 text-emerald-700 hover:bg-emerald-50'
                        : 'bg-stone-800 border-stone-700 text-emerald-400 hover:bg-emerald-950/60'
                    }`}
                    aria-label={`Increase ${denom.label}`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Right: Row Subtotal */}
                <div className="text-right min-w-[76px] sm:min-w-[86px]">
                  <div
                    className={`text-sm font-bold tabular-nums ${
                      subtotal > 0
                        ? isLight
                          ? 'text-stone-900'
                          : 'text-white'
                        : isLight
                        ? 'text-stone-400'
                        : 'text-stone-600'
                    }`}
                  >
                    ₹{formatIndianNumber(String(subtotal))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div
          className={`p-3 border-t space-y-2 shrink-0 ${
            isLight ? 'bg-stone-50/90 border-stone-200' : 'bg-[#1a1a1d] border-stone-800'
          }`}
        >
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={grandTotal === 0}
              className={`py-2 px-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 border transition-all active:scale-95 disabled:opacity-40 ${
                isLight
                  ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                  : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>રીસેટ</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              disabled={grandTotal === 0}
              className={`py-2 px-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 border transition-all active:scale-95 disabled:opacity-40 ${
                isLight
                  ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                  : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
              }`}
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>કોપી</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={grandTotal === 0}
              className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all disabled:opacity-40"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (grandTotal > 0) {
                onApplyToCalculator(String(grandTotal));
              }
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-[#2ebd59] hover:bg-[#259b48] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all"
          >
            <CalcIcon className="w-4 h-4 stroke-[2.25]" />
            <span>
              {grandTotal > 0
                ? `કેલ્ક્યુલેટરમાં ઉમેરો (₹${formatIndianNumber(String(grandTotal))})`
                : 'કેલ્ક્યુલેટર પર પાછા જાઓ'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
