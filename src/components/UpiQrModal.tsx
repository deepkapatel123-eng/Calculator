import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Settings,
  Volume2,
  Download,
  Store,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Receipt,
  FileCheck,
  Smartphone,
  ShieldCheck,
  HelpCircle,
  Tag,
  Zap,
} from 'lucide-react';
import { PaymentTransaction } from '../types';
import {
  parseBankSms,
  checkRemarkMatch,
  generateSampleBankSms,
} from '../utils/upiRemarkEngine';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculatedAmount: string; // From calculator display
  onPaymentReceived?: (transaction: PaymentTransaction) => void;
  onOpenPaymentHistory?: () => void;
}

const STORAGE_VPA_KEY = 'upi_calculator_vpa_address';
const STORAGE_PAYEE_KEY = 'upi_calculator_payee_name';
const STORAGE_NOTE_PREFIX_KEY = 'upi_calculator_note_prefix';
const STORAGE_AUTO_DETECT_KEY = 'upi_calculator_auto_detect';

const DEFAULT_VPA = '9429032801@okbizaxis';
const DEFAULT_PAYEE = 'Merchant Store';
const DEFAULT_PREFIX = 'GROCERY BILL';

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

  // Remark Prefix (e.g. GROCERY BILL, GPAY, etc.)
  const [remarkPrefix, setRemarkPrefix] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_NOTE_PREFIX_KEY);
    if (!saved || saved === 'BILL' || saved === 'bill') {
      try {
        localStorage.setItem(STORAGE_NOTE_PREFIX_KEY, 'GROCERY BILL');
      } catch {
        // ignore
      }
      return 'GROCERY BILL';
    }
    return saved;
  });

  // Unique Remark Code generated for each bill (e.g. GROCERY BILL-482)
  const [remarkCode, setRemarkCode] = useState<string>('');

  // Auto-detect / Demo simulation option
  const [autoDetectDemo, setAutoDetectDemo] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_AUTO_DETECT_KEY) === 'true';
  });

  const [amount, setAmount] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [copiedRemark, setCopiedRemark] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSoundboxPlaying, setIsSoundboxPlaying] = useState<boolean>(false);

  // Live Payment Status State: 'PENDING' | 'SUCCESS'
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'SUCCESS'>('PENDING');
  const [confirmedPayment, setConfirmedPayment] = useState<PaymentTransaction | null>(null);
  const [matchedRemarkInfo, setMatchedRemarkInfo] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Bank SMS Auto-Checker Drawer / Modal State
  const [showSmsChecker, setShowSmsChecker] = useState<boolean>(false);
  const [smsInputText, setSmsInputText] = useState<string>('');
  const [smsParseError, setSmsParseError] = useState<string | null>(null);
  const [isVerifyingSms, setIsVerifyingSms] = useState<boolean>(false);

  // Settings form states
  const [tempVpa, setTempVpa] = useState<string>(vpa);
  const [tempPayee, setTempPayee] = useState<string>(payeeName);
  const [tempPrefix, setTempPrefix] = useState<string>(remarkPrefix);
  const [tempAutoDetect, setTempAutoDetect] = useState<boolean>(autoDetectDemo);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Generate unique order ID & unique Remark Code for each bill
  const generateNewBill = (prefix = remarkPrefix) => {
    const num = Math.floor(100 + Math.random() * 900); // 3-digit easy remark
    const newRemark = `${prefix.trim() || 'GROCERY BILL'}-${num}`;
    const newOrderId = `GPAY-${Date.now().toString().slice(-5)}-${num}`;

    setRemarkCode(newRemark);
    setOrderId(newOrderId);
    setPaymentStatus('PENDING');
    setConfirmedPayment(null);
    setMatchedRemarkInfo(null);
    setElapsedSeconds(0);
    setSmsParseError(null);
    return { newRemark, newOrderId };
  };

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
      generateNewBill(remarkPrefix);
      setTempVpa(vpa);
      setTempPayee(payeeName);
      setTempPrefix(remarkPrefix);
      setTempAutoDetect(autoDetectDemo);
      setIsSettingsOpen(false);
      setShowSmsChecker(false);
      setSmsInputText('');
    }
  }, [isOpen, calculatedAmount, vpa, payeeName, remarkPrefix, autoDetectDemo]);

  // Elapsed Timer while in PENDING state
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'PENDING') return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentStatus]);

  // Google Pay Soundbox Simulator (Chime + Gujarati/Hindi/English voice)
  const playSoundboxAnnouncement = (amtStr: string) => {
    setIsSoundboxPlaying(true);
    try {
      // Google Pay signature 4-tone chime chord using Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
        });
      }
    } catch {
      // Audio fallback
    }

    // Gujarati speech announcement
    setTimeout(() => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const voices = window.speechSynthesis.getVoices();
          const guVoice = voices.find((v) => v.lang.startsWith('gu'));
          const hiVoice = voices.find((v) => v.lang.startsWith('hi'));
          const enInVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));

          const text = guVoice
            ? `Google Pay પર ${amtStr} રૂપિયા સફળતાપૂર્વક મળ્યા!`
            : hiVoice
            ? `Google Pay पर ${amtStr} रुपये प्राप्त हुए!`
            : `Received ${amtStr} rupees successfully on Google Pay!`;

          const utterance = new SpeechSynthesisUtterance(text);
          if (guVoice) {
            utterance.voice = guVoice;
            utterance.lang = 'gu-IN';
          } else if (hiVoice) {
            utterance.voice = hiVoice;
            utterance.lang = 'hi-IN';
          } else if (enInVoice) {
            utterance.voice = enInVoice;
          }
          utterance.rate = 1.0;
          utterance.pitch = 1.05;

          utterance.onend = () => setIsSoundboxPlaying(false);
          utterance.onerror = () => setIsSoundboxPlaying(false);

          window.speechSynthesis.speak(utterance);
        } else {
          setIsSoundboxPlaying(false);
        }
      } catch {
        setIsSoundboxPlaying(false);
      }
    }, 450);
  };

  // Mark payment as received
  const handleMarkPaymentReceived = (paymentDetails?: Partial<PaymentTransaction>, matchedRemark?: string) => {
    const amtNum = parseFloat(amount) || 0;
    const utrGenerated = `${Math.floor(400000000000 + Math.random() * 599999999999)}`;
    const tx: PaymentTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: orderId || `GPAY-${Date.now()}`,
      amount: paymentDetails?.amount || amtNum,
      customerName: paymentDetails?.customerName || 'Google Pay Customer',
      utr: paymentDetails?.utr || utrGenerated,
      vpa: vpa || DEFAULT_VPA,
      payeeName: payeeName || DEFAULT_PAYEE,
      note: matchedRemark || remarkCode,
      status: 'SUCCESS',
      timestamp: Date.now(),
      source: paymentDetails?.source || 'gpay',
    };

    setPaymentStatus('SUCCESS');
    setConfirmedPayment(tx);
    setMatchedRemarkInfo(matchedRemark || remarkCode);
    setShowSmsChecker(false);

    if (onPaymentReceived) {
      onPaymentReceived(tx);
    }

    const announceAmount = (tx.amount > 0 ? tx.amount : amtNum).toFixed(0);
    playSoundboxAnnouncement(announceAmount);
  };

  // 1. AUTOMATIC REMARK POLLING: Continuously check backend for this exact remark
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'PENDING' || !remarkCode) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        // Check by remark endpoint
        const res = await fetch(`/api/payments/check-by-remark?remark=${encodeURIComponent(remarkCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'SUCCESS' && isMounted) {
            handleMarkPaymentReceived(data.payment, remarkCode);
            return;
          }
        }

        // Also check by orderId
        if (orderId) {
          const resOrder = await fetch(`/api/payments/status/${orderId}`);
          if (resOrder.ok) {
            const dataOrder = await resOrder.json();
            if (dataOrder && dataOrder.status === 'SUCCESS' && isMounted) {
              handleMarkPaymentReceived(dataOrder.payment, remarkCode);
            }
          }
        }
      } catch {
        // Network fallback
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isOpen, paymentStatus, remarkCode, orderId]);

  // 2. AUTOMATIC BANK SMS PARSER & VERIFIER
  const handleVerifySmsText = (rawSms: string) => {
    setIsVerifyingSms(true);
    setSmsParseError(null);

    const parsed = parseBankSms(rawSms);

    if (!parsed.isCredit && !rawSms.toLowerCase().includes('credited')) {
      setSmsParseError('આ ક્રેડિટ (જમા) મેસેજ નથી. કૃપા કરીને બેંક તરફથી આવેલ જમા મેસેજ નાખો.');
      setIsVerifyingSms(false);
      return;
    }

    // Check remark match
    const isMatched = checkRemarkMatch(remarkCode, parsed.remark || parsed.rawText);

    if (isMatched) {
      // Remark matched!
      const paymentAmt = parsed.amount || parseFloat(amount) || 0;
      handleMarkPaymentReceived(
        {
          amount: paymentAmt,
          utr: parsed.utr || `${Math.floor(400000000000 + Math.random() * 599999999999)}`,
          customerName: parsed.payerName || `${parsed.bankName || 'Bank'} UPI User`,
          source: 'upi',
        },
        remarkCode
      );
      setIsVerifyingSms(false);
    } else {
      // Remark not matched
      setSmsParseError(
        `રિમાર્ક મેળ ખાતો નથી! SMS માં "${remarkCode}" હોવું જરૂરી છે. કૃપા કરીને તપાસો.`
      );
      setIsVerifyingSms(false);
    }
  };

  // Quick Test with Realistic Bank SMS
  const handleTestBankSmsSimulation = (bank: 'axis' | 'sbi' | 'hdfc') => {
    const amt = parseFloat(amount) || 100;
    const sampleSms = generateSampleBankSms(remarkCode, amt, bank);
    setSmsInputText(sampleSms);
    handleVerifySmsText(sampleSms);
  };

  // Optional: Auto-detect demo mode (8s)
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'PENDING' || !autoDetectDemo) return;

    const autoTimer = setTimeout(() => {
      handleMarkPaymentReceived(
        {
          customerName: 'Customer (Auto-Detected by Remark)',
        },
        remarkCode
      );
    }, 8000);

    return () => clearTimeout(autoTimer);
  }, [isOpen, paymentStatus, autoDetectDemo, remarkCode]);

  // Construct official UPI URI with Google Pay parameters and Remark Code
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
    // Set official Transaction Note (tn) to the exact Remark Code
    params.append('tn', remarkCode || 'BILL');
    if (orderId) {
      params.append('tr', orderId); // Transaction Reference
    }

    return `upi://pay?${params.toString()}`;
  }, [vpa, payeeName, amount, remarkCode, orderId]);

  const gpayDirectUri = useMemo(() => upiUri, [upiUri]);

  // Generate full QR Code
  useEffect(() => {
    if (!isOpen || !upiUri) return;

    QRCode.toDataURL(upiUri, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });
  }, [isOpen, upiUri]);

  // Save Settings
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanVpa = tempVpa.trim() || DEFAULT_VPA;
    const cleanPayee = tempPayee.trim() || DEFAULT_PAYEE;
    const cleanPrefix = tempPrefix.trim().toUpperCase() || DEFAULT_PREFIX;

    setVpa(cleanVpa);
    setPayeeName(cleanPayee);
    setRemarkPrefix(cleanPrefix);
    setAutoDetectDemo(tempAutoDetect);

    try {
      localStorage.setItem(STORAGE_VPA_KEY, cleanVpa);
      localStorage.setItem(STORAGE_PAYEE_KEY, cleanPayee);
      localStorage.setItem(STORAGE_NOTE_PREFIX_KEY, cleanPrefix);
      localStorage.setItem(STORAGE_AUTO_DETECT_KEY, tempAutoDetect ? 'true' : 'false');
    } catch {
      // ignore
    }

    // Refresh remark with new prefix
    generateNewBill(cleanPrefix);

    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setIsSettingsOpen(false);
    }, 900);
  };

  const handleApplySuffix = (suffix: string) => {
    const currentBase = tempVpa.split('@')[0] || '';
    setTempVpa(`${currentBase}${suffix}`);
  };

  const handleAddAmount = (addVal: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addVal).toFixed(2));
    generateNewBill();
  };

  const handleCopyLink = () => {
    if (!upiUri) return;
    navigator.clipboard.writeText(upiUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyVpa = () => {
    if (!vpa) return;
    navigator.clipboard.writeText(vpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleCopyRemark = () => {
    if (!remarkCode) return;
    navigator.clipboard.writeText(remarkCode);
    setCopiedRemark(true);
    setTimeout(() => setCopiedRemark(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `GPay_QR_${remarkCode}_₹${amount || '0'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp share message
  const whatsappShareText = useMemo(() => {
    if (!upiUri) return '';
    const amtDisplay = amount && parseFloat(amount) > 0 ? `₹${parseFloat(amount).toFixed(2)}` : '';
    const lines = [
      `🧾 *Google Pay for Business Payment Request*`,
      `🏬 *${payeeName}*`,
      amtDisplay ? `💰 રકમ / Amount: *${amtDisplay}*` : '',
      `🏷️ *પેમેન્ટ રિમાર્ક: ${remarkCode}*`,
      `🆔 UPI ID: *${vpa}*`,
      ``,
      `👉 *પેમેન્ટ કરવા માટે નીચેની લિંક પર ક્લિક કરો:*`,
      upiUri,
      ``,
      `⚠️ _નોંધ: Google Pay માં પેમેન્ટ કરતી વખતે રિમાર્ક "${remarkCode}" રાખવાથી આપમેળે જમા થઈ જશે._`,
    ].filter(Boolean);
    return lines.join('\n');
  }, [upiUri, amount, remarkCode, vpa, payeeName]);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="upi-qr-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="upi-qr-modal-container"
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Modal Header: Branded Google Pay for Business */}
        <div className="bg-gradient-to-r from-[#1a73e8] via-[#1e8e3e] to-[#f9ab00] p-[2px]">
          <div className="bg-[#1f2937] px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs p-1">
                <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                  <div className="bg-[#4285F4] rounded-xs" />
                  <div className="bg-[#EA4335] rounded-xs" />
                  <div className="bg-[#34A853] rounded-xs" />
                  <div className="bg-[#FBBC05] rounded-xs" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold tracking-tight leading-tight text-white">
                    Google Pay for Business
                  </h2>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/40">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 font-medium truncate max-w-[160px]">
                  {payeeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenPaymentHistory && (
                <button
                  onClick={onOpenPaymentHistory}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                  title="View Received Payments History"
                >
                  <Receipt className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isSettingsOpen
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white'
                }`}
                title="Configure Google Pay Business Account"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                id="upi-modal-close-btn"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-3 text-stone-800 scrollbar-none">
          {/* Settings Section (Collapsible) */}
          {isSettingsOpen && (
            <div className="w-full bg-blue-50/80 border border-blue-200/90 rounded-2xl p-3.5 mb-1 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-200/70">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Pay Business &amp; રિમાર્ક સેટિંગ્સ</span>
                </div>
                <span className="text-[10px] text-blue-600 font-medium">Auto Saved</span>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    વેપારી / દુકાનનું નામ:
                  </label>
                  <input
                    type="text"
                    value={tempPayee}
                    onChange={(e) => setTempPayee(e.target.value)}
                    placeholder="Merchant Name"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Google Pay Business UPI ID:
                  </label>
                  <input
                    type="text"
                    value={tempVpa}
                    onChange={(e) => setTempVpa(e.target.value)}
                    placeholder="9429032801@okbizaxis"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                  />

                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-stone-500 font-medium">Quick suffix:</span>
                    {GPAY_SUFFIXES.map((suf) => (
                      <button
                        type="button"
                        key={suf}
                        onClick={() => handleApplySuffix(suf)}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-stone-200 hover:border-blue-400 text-stone-700 font-mono transition-colors"
                      >
                        {suf}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    ઓટોમેટિક રિમાર્ક પ્રીફિક્સ (Remark Prefix):
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tempPrefix}
                      onChange={(e) => setTempPrefix(e.target.value.toUpperCase())}
                      placeholder="GROCERY BILL"
                      maxLength={25}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:border-blue-600 font-mono font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">
                    દરેક બિલ વખતે આ નામ સાથે ઓટોમેટિક રિમાર્ક કોડ (જેમ કે {tempPrefix || 'GROCERY BILL'}-101, {tempPrefix || 'GROCERY BILL'}-102) બનશે.
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-white border border-stone-200 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-stone-800">
                      ઓટો-ડિટેક્ટ ટેસ્ટ મોડ (8 સેકન્ડ)
                    </div>
                    <div className="text-[10px] text-stone-500">
                      QR બતાવ્યા બાદ 8 સેકન્ડમાં આપમેળે રિમાર્ક મેચ બતાવો
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempAutoDetect}
                    onChange={(e) => setTempAutoDetect(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setTempVpa(DEFAULT_VPA);
                      setTempPayee(DEFAULT_PAYEE);
                      setTempPrefix(DEFAULT_PREFIX);
                      setTempAutoDetect(false);
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

          {/* ======================================================== */}
          {/* CASE 1: PAYMENT RECEIVED! (SUCCESS VIEW)                 */}
          {/* ======================================================== */}
          {paymentStatus === 'SUCCESS' && confirmedPayment ? (
            <div className="w-full flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
              <div className="w-full bg-gradient-to-b from-emerald-500 to-emerald-700 text-white rounded-3xl p-5 shadow-lg flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles className="w-24 h-24 text-white" />
                </div>

                <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md mb-2 animate-bounce">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>

                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-900/50 text-emerald-100 text-xs font-semibold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>રિમાર્ક મેળ ખાઈ ગયો: {matchedRemarkInfo || remarkCode}</span>
                </div>

                <h3 className="text-xl font-bold tracking-tight">
                  પેમેન્ટ સફળતાપૂર્વક મળ્યું!
                </h3>
                <p className="text-emerald-100 text-xs">Payment Received &amp; Verified</p>

                <div className="text-4xl font-black tracking-tight my-2">
                  ₹{confirmedPayment.amount.toFixed(2)}
                </div>

                <button
                  type="button"
                  onClick={() => playSoundboxAnnouncement(confirmedPayment.amount.toFixed(0))}
                  disabled={isSoundboxPlaying}
                  className="mt-1 py-1.5 px-3 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>
                    {isSoundboxPlaying ? '🔊 અવાજ વાગી રહ્યો છે...' : '🔊 ફરી અવાજ સાંભળો'}
                  </span>
                </button>
              </div>

              {/* Receipt Details Card */}
              <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">મેળ ખાધેલ રિમાર્ક (Matched Remark)</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {matchedRemarkInfo || remarkCode}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">ગ્રાહક (Customer)</span>
                  <span className="font-bold text-stone-900">
                    {confirmedPayment.customerName}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">UPI Ref / UTR No.</span>
                  <span className="font-mono font-bold text-stone-900">
                    {confirmedPayment.utr}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">સમય (Timestamp)</span>
                  <span className="text-stone-700 font-medium">
                    {new Date(confirmedPayment.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">વેરિફિકેશન (Status)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    ઓટોમેટિક વેરિફાઈડ (AUTO-MATCH)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🧾 *Google Pay Payment Receipt / પહોંચ*\n` +
                    `🏬 દુકાન: *${confirmedPayment.payeeName}*\n` +
                    `💰 જમા થયેલ રકમ: *₹${confirmedPayment.amount.toFixed(2)}*\n` +
                    `🏷️ રિમાર્ક: *${matchedRemarkInfo || remarkCode}*\n` +
                    `👤 ગ્રાહક: *${confirmedPayment.customerName}*\n` +
                    `🆔 UPI Ref / UTR: *${confirmedPayment.utr}*\n` +
                    `📅 સમય: *${new Date(confirmedPayment.timestamp).toLocaleString('gu-IN')}*\n` +
                    `✅ સ્ટેટસ: *સફળ (PAID)*\n\n` +
                    `_Google Pay for Business તરફથી આભાર._`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp પર પહોંચ (Receipt) મોકલો</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  {onOpenPaymentHistory && (
                    <button
                      type="button"
                      onClick={onOpenPaymentHistory}
                      className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-[0.99] text-stone-800 font-medium text-xs flex items-center justify-center gap-1.5 transition-all border border-stone-200"
                    >
                      <Receipt className="w-3.5 h-3.5 text-stone-600" />
                      <span>પેમેન્ટ હિસ્ટ્રી જુઓ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      generateNewBill();
                    }}
                    className={`py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                      !onOpenPaymentHistory ? 'col-span-2' : ''
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>નવું પેમેન્ટ લ્યો (New Bill)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* CASE 2: WAITING FOR PAYMENT WITH REMARK TRACKING         */
            /* ======================================================== */
            <>
              {/* Remark Tracking Live Status Banner */}
              <div
                id="upi-remark-status-banner"
                className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-3 flex flex-col gap-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping absolute" />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 relative inline-block" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <span>રિમાર્ક પ્રમાણે ઓટોમેટિક ચેક ચાલુ છે</span>
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="text-[10.5px] text-blue-800">
                        ગ્રાહક આ રિમાર્કથી પેમેન્ટ કરશે એટલે આપમેળે પકડી લેશે
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded-full text-blue-900 border border-blue-200 shadow-2xs">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>{formatTimer(elapsedSeconds)}</span>
                  </div>
                </div>

                {/* Highlighted Remark Pill */}
                <div className="bg-white rounded-xl p-2 border border-blue-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-[11px] text-stone-500 font-medium">આ બિલનો રિમાર્ક:</span>
                    <span className="font-mono font-black text-sm text-blue-700 tracking-wide">
                      {remarkCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCopyRemark}
                      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10.5px] font-semibold flex items-center gap-1 border border-blue-200 transition-colors"
                      title="Copy Remark Code"
                    >
                      {copiedRemark ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRemark ? 'Copied' : 'કોપી'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => generateNewBill()}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      title="Generate New Remark Code"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

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
                      <span className="text-xs font-medium text-emerald-800">
                        {remarkCode} • UPI Payment
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
                      onChange={(e) => {
                        setAmount(e.target.value);
                        generateNewBill();
                      }}
                      placeholder="0.00"
                      className="w-28 text-right font-extrabold text-2xl text-stone-900 bg-transparent border-b border-transparent focus:border-emerald-600 focus:outline-none tracking-tight"
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
                    onClick={() => {
                      setAmount('');
                      generateNewBill();
                    }}
                    className="px-2 py-1 rounded-md bg-stone-200/70 hover:bg-stone-300 text-stone-600 text-[10px] font-medium transition-colors"
                    title="Clear Amount"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* QR Code Display */}
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
                    <div className="mt-2 flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200">
                      <span>📷 ગ્રાહક પોતાના મોબાઈલમાંથી આ QR સ્કેન કરશે</span>
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
                    <span>QR માં રિમાર્ક "{remarkCode}" સેટ છે</span>
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

              {/* BANK SMS & NOTIFICATION REMARK CHECKER DRAWER */}
              <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-2.5 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>બેંક SMS વડે આપમેળે વેરિફાય કરો</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSmsChecker(!showSmsChecker)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    {showSmsChecker ? 'છુપાવો' : 'SMS પેસ્ટ કરો'}
                  </button>
                </div>

                {/* Quick Simulation Buttons to demonstrate Remark-based instant auto-check */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-stone-500 font-medium">ઓટો-ચેક ટેસ્ટ:</span>
                  <button
                    type="button"
                    onClick={() => handleTestBankSmsSimulation('axis')}
                    className="px-2 py-0.5 rounded text-[10.5px] bg-white border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 text-stone-700 font-semibold transition-all shadow-2xs"
                    title="Test with Axis Bank SMS"
                  >
                    Axis SMS થી ચેક કરો
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestBankSmsSimulation('sbi')}
                    className="px-2 py-0.5 rounded text-[10.5px] bg-white border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 text-stone-700 font-semibold transition-all shadow-2xs"
                    title="Test with SBI SMS"
                  >
                    SBI SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestBankSmsSimulation('hdfc')}
                    className="px-2 py-0.5 rounded text-[10.5px] bg-white border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 text-stone-700 font-semibold transition-all shadow-2xs"
                    title="Test with HDFC Bank SMS"
                  >
                    HDFC SMS
                  </button>
                </div>

                {/* SMS Paste Input Box */}
                {showSmsChecker && (
                  <div className="space-y-1.5 pt-1 border-t border-stone-200 animate-in fade-in duration-150">
                    <label className="block text-[10px] font-semibold text-stone-600">
                      ફોન પર આવેલો બેંક SMS અહીં પેસ્ટ કરો (રિમાર્ક {remarkCode} સાથે):
                    </label>
                    <textarea
                      rows={2}
                      value={smsInputText}
                      onChange={(e) => setSmsInputText(e.target.value)}
                      placeholder="e.g. Your A/C is credited by INR ... by UPI ... tn=..."
                      className="w-full p-2 text-xs font-mono rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-blue-600 text-stone-800"
                    />

                    {smsParseError && (
                      <p className="text-[10.5px] text-rose-600 font-medium bg-rose-50 p-1.5 rounded-md border border-rose-200">
                        {smsParseError}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText();
                            if (clip) {
                              setSmsInputText(clip);
                              handleVerifySmsText(clip);
                            }
                          } catch {
                            // clipboard fallback
                          }
                        }}
                        className="text-[10.5px] text-stone-600 hover:text-stone-900 underline"
                      >
                        ક્લિપબોર્ડમાંથી વાંચો (Paste)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifySmsText(smsInputText)}
                        disabled={!smsInputText.trim() || isVerifyingSms}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
                      >
                        {isVerifyingSms ? 'તપાસી રહ્યા છીએ...' : 'રિમાર્ક ચેક કરો'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Manual Confirmation fallback button */}
              <button
                type="button"
                onClick={() => handleMarkPaymentReceived(undefined, remarkCode)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                title="ગ્રાહકે પેમેન્ટ કર્યું હોય તો અહીં ક્લિક કરી કન્ફર્મ કરો"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>ગ્રાહકે પેમેન્ટ કર્યું? કન્ફર્મ કરો (Payment Received)</span>
              </button>

              {/* Action Buttons: Purely in-app with NO external upi:// app-picker intent */}
              <div id="upi-send-options-container" className="w-full flex flex-col gap-2 pt-1">
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

                <a
                  id="upi-send-whatsapp-btn"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all text-center"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp પર રિમાર્ક અને QR મોકલો</span>
                </a>

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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
