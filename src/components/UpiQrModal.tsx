import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Settings,
  Download,
  CheckCircle2,
  Receipt,
  Store,
} from 'lucide-react';
import { PaymentTransaction } from '../types';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculatedAmount: string; // From calculator display
  onPaymentReceived?: (transaction: PaymentTransaction) => void;
  onOpenPaymentHistory?: () => void;
}

const STORAGE_VPA_KEY = 'upi_calculator_vpa_address';
const STORAGE_PAYEE_KEY = 'upi_calculator_payee_name';
const STORAGE_REMARK_KEY = 'upi_calculator_remark';

const DEFAULT_VPA = '9429032801@okbizaxis';
const DEFAULT_PAYEE = 'Merchant Store';
const DEFAULT_REMARK = 'Grocery Bill Payment';

// Common Google Pay / UPI bank suffixes for quick selection
const GPAY_SUFFIXES = [
  '@okbizaxis',
  '@okaxis',
  '@okhdfcbank',
  '@oksbi',
  '@okicici',
];

export const UpiQrModal: React.FC<UpiQrModalProps> = ({
  isOpen,
  onClose,
  calculatedAmount,
  onPaymentReceived,
  onOpenPaymentHistory,
}) => {
  // Merchant VPA (UPI ID)
  const [vpa, setVpa] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_VPA_KEY);
    if (!saved || saved === 'merchant@upi') {
      try {
        localStorage.setItem(STORAGE_VPA_KEY, DEFAULT_VPA);
      } catch {
        // ignore
      }
      return DEFAULT_VPA;
    }
    return saved;
  });

  // Merchant / Payee Name
  const [payeeName, setPayeeName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_PAYEE_KEY) || DEFAULT_PAYEE;
  });

  // Transaction Remark
  const [remark, setRemark] = useState<string>(() => {
    return localStorage.getItem(STORAGE_REMARK_KEY) || DEFAULT_REMARK;
  });

  const [amount, setAmount] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [savedToHistoryToast, setSavedToHistoryToast] = useState<boolean>(false);

  // Settings form states
  const [tempVpa, setTempVpa] = useState<string>(vpa);
  const [tempPayee, setTempPayee] = useState<string>(payeeName);
  const [tempRemark, setTempRemark] = useState<string>(remark);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Sync amount from calculator display when opened
  useEffect(() => {
    if (isOpen) {
      const cleaned = calculatedAmount.replace(/,/g, '').trim();
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) {
        setAmount(num.toFixed(2));
      } else {
        setAmount('');
      }
      setTempVpa(vpa);
      setTempPayee(payeeName);
      setTempRemark(remark);
      setIsSettingsOpen(false);
      setSavedToHistoryToast(false);
    }
  }, [isOpen, calculatedAmount, vpa, payeeName, remark]);

  // Construct official UPI URI with Google Pay parameters
  const upiUri = useMemo(() => {
    const trimmedVpa = (vpa || DEFAULT_VPA).trim();
    if (!trimmedVpa) return '';

    const params = new URLSearchParams();
    params.append('pa', trimmedVpa);
    if (payeeName.trim()) params.append('pn', payeeName.trim());
    if (amount.trim() && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
      params.append('am', parseFloat(amount).toFixed(2));
    }
    params.append('cu', 'INR');
    params.append('tn', (remark || DEFAULT_REMARK).trim());

    return `upi://pay?${params.toString()}`;
  }, [vpa, payeeName, amount, remark]);

  // Generate full QR Code image
  useEffect(() => {
    if (!isOpen || !upiUri) return;

    QRCode.toDataURL(upiUri, {
      width: 400,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate UPI QR:', err));
  }, [isOpen, upiUri]);

  // Add extra amount
  const handleAddAmount = (addVal: number) => {
    const curr = parseFloat(amount) || 0;
    const next = (curr + addVal).toFixed(2);
    setAmount(next);
  };

  // Copy UPI ID
  const handleCopyVpa = async () => {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } catch {
      // fallback
    }
  };

  // Copy Payment Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(upiUri);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  // Download QR Code Image
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `UPI-QR-${amount || 'amount'}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVpa = tempVpa.trim() || DEFAULT_VPA;
    const cleanPayee = tempPayee.trim() || DEFAULT_PAYEE;
    const cleanRemark = tempRemark.trim() || DEFAULT_REMARK;

    setVpa(cleanVpa);
    setPayeeName(cleanPayee);
    setRemark(cleanRemark);

    try {
      localStorage.setItem(STORAGE_VPA_KEY, cleanVpa);
      localStorage.setItem(STORAGE_PAYEE_KEY, cleanPayee);
      localStorage.setItem(STORAGE_REMARK_KEY, cleanRemark);
    } catch {
      // ignore
    }

    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setIsSettingsOpen(false);
    }, 800);
  };

  // Save transaction to local history ledger (without hiding the QR code!)
  const handleSaveToHistory = () => {
    const amtNum = parseFloat(amount) || 0;
    const currentRemark = (remark || DEFAULT_REMARK).trim();
    const tx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      orderId: `GPAY-${Date.now().toString().slice(-6)}`,
      amount: amtNum,
      customerName: 'Customer',
      utr: `${Math.floor(400000000000 + Math.random() * 599999999999)}`,
      vpa: vpa || DEFAULT_VPA,
      payeeName: payeeName || DEFAULT_PAYEE,
      note: currentRemark,
      status: 'SUCCESS',
      timestamp: Date.now(),
      source: 'gpay',
    };

    if (onPaymentReceived) {
      onPaymentReceived(tx);
    }

    setSavedToHistoryToast(true);
    setTimeout(() => setSavedToHistoryToast(false), 2500);
  };

  // WhatsApp share link
  const whatsappUrl = useMemo(() => {
    const amtText = amount ? `*₹${parseFloat(amount).toFixed(2)}*` : 'રકમ';
    const currentRemark = (remark || DEFAULT_REMARK).trim();
    const text =
      `🏪 *${payeeName}* તરફથી Google Pay / UPI પેમેન્ટ વિગત:\n\n` +
      `💰 ચૂકવવાપાત્ર રકમ: ${amtText}\n` +
      `🆔 UPI ID: *${vpa}*\n` +
      `📝 Remark: *${currentRemark}*\n\n` +
      `📲 સીધું પેમેન્ટ કરવા માટે આ લિંક પર ક્લિક કરો:\n${upiUri}\n\n` +
      `_Google Pay, PhonePe, Paytm અથવા કોઈપણ UPI એપથી પેમેન્ટ કરી શકો છો._`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }, [payeeName, amount, vpa, remark, upiUri]);

  if (!isOpen) return null;

  return (
    <div
      id="upi-qr-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="upi-qr-modal-dialog"
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Google Pay for Business Brand Header */}
        <div className="bg-[#1a1a1c] text-white px-4 py-3 flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs p-1">
              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                <div className="bg-[#4285F4] rounded-[1.5px]" />
                <div className="bg-[#EA4335] rounded-[1.5px]" />
                <div className="bg-[#34A853] rounded-[1.5px]" />
                <div className="bg-[#FBBC05] rounded-[1.5px]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight leading-none text-white">
                  Google Pay UPI QR
                </h3>
              </div>
              <p className="text-[11px] text-stone-300 font-medium truncate max-w-[170px] leading-tight mt-0.5">
                {payeeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenPaymentHistory && (
              <button
                type="button"
                onClick={onOpenPaymentHistory}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 flex items-center justify-center transition-colors"
                title="પેમેન્ટ હિસ્ટ્રી જુઓ"
              >
                <Receipt className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 flex items-center justify-center transition-colors"
              title="UPI Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 flex items-center justify-center transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 overflow-y-auto flex flex-col items-center gap-3">
          {/* Settings Drawer */}
          {isSettingsOpen && (
            <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200">
                <span className="font-bold text-xs text-stone-800 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  <span>દુકાન / વેપારી સેટિંગ્સ</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-[11px] text-stone-500 hover:text-stone-800"
                >
                  બંધ કરો
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    દુકાનદાર / પેઢીનું નામ (Payee Name):
                  </label>
                  <input
                    type="text"
                    value={tempPayee}
                    onChange={(e) => setTempPayee(e.target.value)}
                    placeholder="Merchant Store"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Google Pay UPI ID (VPA):
                  </label>
                  <input
                    type="text"
                    value={tempVpa}
                    onChange={(e) => setTempVpa(e.target.value)}
                    placeholder="9429032801@okbizaxis"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                    required
                  />

                  {/* Quick Suffixes */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {GPAY_SUFFIXES.map((suf) => (
                      <button
                        key={suf}
                        type="button"
                        onClick={() => {
                          const base = tempVpa.split('@')[0] || '9429032801';
                          setTempVpa(`${base}${suf}`);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
                      >
                        {suf}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    પેમેન્ટ રિમાર્ક / નોંધ (UPI Remark / Note):
                  </label>
                  <input
                    type="text"
                    value={tempRemark}
                    onChange={(e) => setTempRemark(e.target.value)}
                    placeholder="Grocery Bill Payment"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:border-blue-600 font-medium"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    ગ્રાહકની UPI એપમાં આ રિમાર્ક દેખાશે.
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setTempVpa(DEFAULT_VPA);
                      setTempPayee(DEFAULT_PAYEE);
                      setTempRemark(DEFAULT_REMARK);
                    }}
                    className="text-[11px] text-stone-500 hover:text-stone-800 underline"
                  >
                    Reset Defaults
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors"
                  >
                    {settingsSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <span>Save &amp; Apply</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Amount Display */}
          <div
            id="upi-amount-above-qr"
            className="w-full bg-stone-50 border border-stone-200/90 rounded-2xl p-3 flex flex-col gap-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  ₹
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    Total Amount / રકમ
                  </span>
                  <span className="text-xs font-semibold text-stone-700">
                    Google Pay UPI
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-stone-400 font-bold text-xl">₹</span>
                <input
                  id="upi-amount-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-32 text-right font-extrabold text-2xl text-stone-900 bg-transparent border-b border-transparent focus:border-emerald-600 focus:outline-none tracking-tight"
                />
              </div>
            </div>

            {/* Quick Amount Adjust Buttons */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-200/60">
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddAmount(val)}
                  className="flex-1 py-1 rounded-md bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold border border-stone-200 active:scale-95 transition-all text-center"
                >
                  +{val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('')}
                className="px-2 py-1 rounded-md bg-stone-200/70 hover:bg-stone-300 text-stone-600 text-[10px] font-medium transition-colors"
                title="Clear Amount"
              >
                Clear
              </button>
            </div>
          </div>

          {/* QR Code Display: Always steady and visible */}
          <div
            id="full-qr-code-wrapper"
            className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-3.5 flex flex-col items-center justify-center relative"
          >
            <div className="w-full flex items-center justify-between text-[11px] font-semibold text-stone-600 pb-2 mb-1 border-b border-stone-100">
              <span className="flex items-center gap-1 text-emerald-700 font-bold truncate max-w-[170px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{payeeName}</span>
              </span>
              <button
                onClick={handleCopyVpa}
                className="text-[10px] font-mono text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
                title="Copy UPI ID"
              >
                <span className="truncate max-w-[110px]">{vpa}</span>
                {copiedVpa ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-stone-400" />
                )}
              </button>
            </div>

            {qrDataUrl ? (
              <div className="relative group flex flex-col items-center">
                <img
                  id="full-qr-code-image"
                  src={qrDataUrl}
                  alt="Google Pay Business UPI QR"
                  className="w-56 h-56 sm:w-60 sm:h-60 object-contain rounded-lg p-1 bg-white pointer-events-none select-none"
                />
                <div className="mt-2 flex flex-col items-center gap-1.5 w-full">
                  <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200">
                    <span>📷 ગ્રાહક પોતાના મોબાઈલમાંથી આ QR સ્કેન કરશે</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-semibold border border-emerald-200 w-full max-w-[260px]">
                    <span className="text-[11px] text-emerald-700 font-medium">રિમાર્ક (Remark):</span>
                    <span className="font-bold truncate">{remark || DEFAULT_REMARK}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-stone-400 text-xs">
                Generating Google Pay QR...
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-stone-100 w-full flex items-center justify-between text-[10px] font-semibold text-stone-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>GPay, PhonePe, Paytm થી સ્કેન કરી શકાશે</span>
              </div>
              <button
                onClick={handleDownloadQr}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[10px] font-medium transition-colors"
                title="Download QR Image"
              >
                <Download className="w-3 h-3" />
                <span>Save QR</span>
              </button>
            </div>
          </div>

          {/* Toast Notification when payment is saved to history */}
          {savedToHistoryToast && (
            <div className="w-full bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>આ બિલ પેમેન્ટ હિસ્ટ્રીમાં સેવ થઈ ગયું!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div id="upi-send-options-container" className="w-full flex flex-col gap-2 pt-1">
            {/* Record / Save to History button (keeps user on QR, just saves record) */}
            <button
              type="button"
              onClick={handleSaveToHistory}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-[0.99] text-stone-800 font-bold text-xs flex items-center justify-center gap-2 border border-stone-200 transition-all text-center"
              title="આ પેમેન્ટને હિસ્ટ્રી ખાતામાં સેવ કરો"
            >
              <Receipt className="w-4 h-4 text-stone-600" />
              <span>પેમેન્ટ હિસ્ટ્રીમાં સેવ કરો (Record Payment)</span>
            </button>

            {/* Copy UPI ID Button */}
            <button
              id="gpay-copy-vpa-btn"
              type="button"
              onClick={handleCopyVpa}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all text-center"
              title="Copy UPI ID to clipboard"
            >
              {copiedVpa ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
                  <span>UPI ID કોપી થઈ ગયું! ({vpa})</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>UPI ID કોપી કરો ({vpa})</span>
                </>
              )}
            </button>

            {/* WhatsApp Share Link */}
            <a
              id="upi-send-whatsapp-btn"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all text-center"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp પર QR પેમેન્ટ લિંક મોકલો</span>
            </a>

            {/* Copy / Share QR Link */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="upi-send-share-btn"
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-[0.99] text-stone-800 font-medium text-xs flex items-center justify-center gap-1.5 transition-all border border-stone-200"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-600" />
                <span>શેર QR લિંક</span>
              </button>

              <button
                id="upi-send-copy-btn"
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-[0.99] text-stone-800 font-medium text-xs flex items-center justify-center gap-1.5 transition-all border border-stone-200"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-600" />
                )}
                <span>{copiedLink ? 'Copied!' : 'Copy Payment Link'}</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-1 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
            >
              બંધ કરો (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
