import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import {
  Ruler,
  Download,
  QrCode,
  Receipt,
  CheckCircle2,
  Sparkles,
  Volume2,
  Share2,
  MessageCircle,
  RotateCcw,
  Zap,
  Plus,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { evaluateExpression, formatIndianNumber } from '../utils/calculatorEngine';
import { HistoryItem, PaymentTransaction } from '../types';
import { playGooglePaySoundbox } from '../utils/soundbox';

interface CalculatorProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  externalInsertValue?: string | null;
  onClearExternalInsert?: () => void;
  onOpenConverter: () => void;
  onOpenUpiQr: (amount: string) => void;
  onOpenApkModal?: () => void;
  onOpenPaymentHistory?: () => void;
  onDirectPaymentReceived?: (tx: PaymentTransaction) => void;
  paymentsCount?: number;
  history?: HistoryItem[];
  onClearHistory?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  onAddHistory,
  externalInsertValue,
  onClearExternalInsert,
  onOpenConverter,
  onOpenUpiQr,
  onOpenApkModal,
  onOpenPaymentHistory,
  onDirectPaymentReceived,
  paymentsCount = 0,
  history = [],
  onClearHistory,
  theme = 'light',
  onToggleTheme,
}) => {
  // Current equation. Stored and preserved at all times
  const [equation, setEquation] = useState<string>('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScientificOpen, setIsScientificOpen] = useState<boolean>(false);

  // Split history view is closed by default so user can immediately use calculator
  const [isInlineHistoryOpen, setIsInlineHistoryOpen] = useState<boolean>(false);

  // Touch scroll detection to prevent accidental clicks when scrolling history
  const touchStartYRef = useRef<number | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  // Compute live result in real time
  const liveResult = useMemo(() => {
    if (!equation || equation === '0') return null;

    // Check if equation contains an operator or function
    const hasOperator = /[+\−\×\÷\*\/\-\^%]/.test(equation);
    if (!hasOperator) return null;

    // If equation ends with an operator (like 500+), show the number so far
    let evalStr = equation;
    while (evalStr.length > 0 && /[+\−\×\÷\*\/\-\^]/.test(evalStr.slice(-1))) {
      evalStr = evalStr.slice(0, -1);
    }
    if (!evalStr) return null;

    const res = evaluateExpression(evalStr);
    if (res.success && res.result !== undefined) {
      return res.result;
    }
    return null;
  }, [equation]);

  // Current numeric amount in calculator for direct GPay payment
  const currentCalculatedAmount = useMemo(() => {
    if (liveResult && !isNaN(parseFloat(liveResult)) && parseFloat(liveResult) > 0) {
      return parseFloat(liveResult).toFixed(2);
    }
    const clean = equation.replace(/,/g, '');
    const match = clean.match(/(\d+(?:\.\d+)?)/g);
    if (match && match.length > 0) {
      const lastNum = parseFloat(match[match.length - 1]);
      if (!isNaN(lastNum) && lastNum > 0) return lastNum.toFixed(2);
    }
    return '0.00';
  }, [liveResult, equation]);

  // Direct In-Calculator Payment Reception States
  const [directPaymentAlert, setDirectPaymentAlert] = useState<PaymentTransaction | null>(null);
  const [isSoundboxPlaying, setIsSoundboxPlaying] = useState<boolean>(false);
  const lastSeenPaymentTimeRef = useRef<number>(Date.now());

  // Function to directly trigger/receive payment right on calculator
  const handleDirectReceivePayment = useCallback(
    (customAmount?: number, customerName = 'Google Pay Customer', remark?: string) => {
      const parsedAmt = customAmount !== undefined ? customAmount : parseFloat(currentCalculatedAmount);
      const finalAmt = isNaN(parsedAmt) || parsedAmt <= 0 ? 100 : parsedAmt;
      const utr = `${Math.floor(400000000000 + Math.random() * 599999999999)}`;
      const orderId = `GPAY-${Date.now().toString().slice(-6)}`;
      const noteStr = remark || `GROCERY BILL-${Math.floor(100 + Math.random() * 900)}`;

      const tx: PaymentTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        amount: finalAmt,
        customerName,
        utr,
        vpa: localStorage.getItem('upi_calculator_vpa_address') || '9429032801@okbizaxis',
        payeeName: localStorage.getItem('upi_calculator_payee_name') || 'Merchant Store',
        note: noteStr,
        status: 'SUCCESS',
        timestamp: Date.now(),
        source: 'gpay',
      };

      setDirectPaymentAlert(tx);
      lastSeenPaymentTimeRef.current = tx.timestamp;

      if (onDirectPaymentReceived) {
        onDirectPaymentReceived(tx);
      }

      // Play Google Pay chime + soundbox voice announcement directly on calculator!
      setIsSoundboxPlaying(true);
      playGooglePaySoundbox(finalAmt).finally(() => setIsSoundboxPlaying(false));
    },
    [currentCalculatedAmount, onDirectPaymentReceived]
  );

  // Background Live Payment Polling: Only active on web deployment with server
  useEffect(() => {
    // Skip in Capacitor / native APK to avoid ERR_CONNECTION_REFUSED every 2s
    if (typeof window === 'undefined' || window.location.hostname === 'localhost' || window.location.protocol === 'file:' || window.location.protocol === 'capacitor:') {
      return;
    }

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/payments/history');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.payments) && data.payments.length > 0) {
            const latest = data.payments[0];
            if (latest.timestamp > lastSeenPaymentTimeRef.current && isMounted) {
              lastSeenPaymentTimeRef.current = latest.timestamp;
              const tx: PaymentTransaction = {
                id: latest.orderId || `tx-${latest.timestamp}`,
                orderId: latest.orderId,
                amount: latest.amount,
                customerName: latest.customerName || 'Google Pay Customer',
                utr: latest.utr,
                vpa: latest.vpa || '9429032801@okbizaxis',
                payeeName: 'Merchant Store',
                note: latest.note || 'GROCERY BILL',
                status: 'SUCCESS',
                timestamp: latest.timestamp,
                source: 'gpay',
              };
              setDirectPaymentAlert(tx);
              if (onDirectPaymentReceived) {
                onDirectPaymentReceived(tx);
              }
              setIsSoundboxPlaying(true);
              playGooglePaySoundbox(latest.amount).finally(() => setIsSoundboxPlaying(false));
            }
          }
        }
      } catch {
        // Polling network fallback
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onDirectPaymentReceived]);

  // Setup native status bar: Clean white with dark icons
  useEffect(() => {
    const initStatusBar = async () => {
      try {
        await StatusBar.show();
        await StatusBar.setOverlaysWebView({ overlay: false });
        if (theme === 'light') {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        } else {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#000000' });
        }
      } catch {
        // web fallback
      }
    };
    initStatusBar();
  }, [theme]);

  // Back button listener: Return to numeric keypad when history is open
  useEffect(() => {
    if (!isInlineHistoryOpen) return;

    let listenerHandle: any = null;
    const setupBack = async () => {
      try {
        listenerHandle = await CapApp.addListener('backButton', () => {
          setIsInlineHistoryOpen(false);
        });
      } catch {
        // web fallback
      }
    };
    setupBack();

    const handlePop = () => {
      setIsInlineHistoryOpen(false);
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
      window.removeEventListener('popstate', handlePop);
    };
  }, [isInlineHistoryOpen]);

  // Handle external insert from Converter
  useEffect(() => {
    if (externalInsertValue !== undefined && externalInsertValue !== null) {
      setEquation(externalInsertValue);
      setErrorMessage(null);
      if (onClearExternalInsert) {
        onClearExternalInsert();
      }
    }
  }, [externalInsertValue, onClearExternalInsert]);

  // Web Audio click feedback
  const audioContextRef = useRef<AudioContext | null>(null);

  const playClickSound = useCallback((frequency = 600, duration = 0.03) => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (audioContextRef.current) {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
        gain.gain.setValueAtTime(0.03, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + duration);
      }
    } catch {
      // Audio might be blocked
    }
  }, []);

  const triggerFeedback = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // ignore
    }
  }, []);

  // Digits input
  const handleDigit = useCallback(
    (digit: string) => {
      triggerFeedback();
      setErrorMessage(null);

      setEquation((prev) => {
        if (prev === '0' && digit !== '.') {
          return digit;
        }
        if (digit === '.') {
          const lastNumChunk = prev.split(/[+\−\×\÷\*\/\-\^%()]/).pop() || '';
          if (lastNumChunk.includes('.')) return prev;
          if (lastNumChunk === '') return prev + '0.';
          return prev + '.';
        }
        return prev + digit;
      });
    },
    [triggerFeedback]
  );

  // Operators (+, −, ×, ÷)
  const handleOperator = useCallback(
    (op: string) => {
      triggerFeedback();
      setErrorMessage(null);

      setEquation((prev) => {
        if (!prev || prev === '0') {
          return '0' + op;
        }
        // If last character is already an operator, replace it
        if (/[+\−\×\÷\*\/\-\^]/.test(prev.slice(-1))) {
          return prev.slice(0, -1) + op;
        }
        return prev + op;
      });
    },
    [triggerFeedback]
  );

  // Parentheses
  const handleParenthesesSmart = useCallback(() => {
    triggerFeedback();
    setErrorMessage(null);

    setEquation((prev) => {
      if (prev === '0') return '(';
      const openCount = (prev.match(/\(/g) || []).length;
      const closeCount = (prev.match(/\)/g) || []).length;
      const lastChar = prev.slice(-1);

      if (openCount > closeCount && /[0-9)]/.test(lastChar)) {
        return prev + ')';
      } else if (/[0-9)]/.test(lastChar)) {
        return prev + '×(';
      } else {
        return prev + '(';
      }
    });
  }, [triggerFeedback]);

  // Percentage
  const handlePercentage = useCallback(() => {
    triggerFeedback();
    setErrorMessage(null);

    setEquation((prev) => {
      if (!prev || prev === '0') return '0';
      if (/[+\−\×\÷\*\/\-\^%]/.test(prev.slice(-1))) return prev;
      return prev + '%';
    });
  }, [triggerFeedback]);

  // Backspace (Green tag icon in toolbar)
  const handleBackspace = useCallback(() => {
    triggerFeedback();
    setErrorMessage(null);

    setEquation((prev) => {
      if (prev.length <= 1) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, [triggerFeedback]);

  // Clear all (C button)
  const handleClear = useCallback(() => {
    triggerFeedback();
    setEquation('0');
    setErrorMessage(null);
  }, [triggerFeedback]);

  // Equals / Calculate (= button)
  const handleEvaluate = useCallback(() => {
    triggerFeedback();
    if (!equation || equation === '0') return;

    let evalStr = equation;
    while (evalStr.length > 0 && /[+\−\×\÷\*\/\-\^]/.test(evalStr.slice(-1))) {
      evalStr = evalStr.slice(0, -1);
    }
    if (!evalStr) return;

    const evalResult = evaluateExpression(evalStr);
    if (evalResult.success && evalResult.result !== undefined) {
      const formattedResult = evalResult.result;

      // Add to history with proper Indian comma formatting
      onAddHistory({
        type: 'arithmetic',
        expression: formatEquationString(evalStr),
        result: formattedResult,
      });

      setEquation(formattedResult);
      setErrorMessage(null);
    } else {
      setErrorMessage(evalResult.error || 'Error');
    }
  }, [equation, onAddHistory, triggerFeedback]);

  // Select item from Inline History:
  // CRITICAL FIX: NEVER destroy ongoing user calculation (e.g. 500+)!
  // If user has an active operator (e.g. "500+"), append the result (500+445).
  // If user had "500", append "+445".
  // The 500 is ALWAYS preserved!
  const handleSelectHistoryItem = useCallback(
    (item: HistoryItem) => {
      if (isScrollingRef.current) return;
      triggerFeedback();

      const cleanResult = item.result.replace(/,/g, '');

      setEquation((prev) => {
        // If equation ends with an operator (e.g. "500+"), APPEND the result!
        // So "500+" becomes "500+445" - preserving 500+!
        if (prev && /[+\−\×\÷\*\/\-\^]$/.test(prev.trim())) {
          return prev + cleanResult;
        }

        // If user already typed a number like "500", append "+ 445" to preserve the 500!
        if (prev && prev !== '0' && /^\d+$/.test(prev.trim())) {
          return prev + '+' + cleanResult;
        }

        // If equation is 0 or empty, use the result
        return cleanResult;
      });
      setErrorMessage(null);
    },
    [triggerFeedback]
  );

  // Trigger UPI QR code
  const handleTriggerUpiQr = useCallback(() => {
    triggerFeedback();
    let amt = liveResult || equation;
    const cleanAmt = amt.replace(/[^0-9.]/g, '');
    onOpenUpiQr(cleanAmt && Number(cleanAmt) > 0 ? cleanAmt : '0');
  }, [liveResult, equation, onOpenUpiQr, triggerFeedback]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDigit('.');
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        handleOperator(e.key === '-' ? '−' : '+');
      } else if (e.key === '*' || e.key === 'x') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercentage();
      } else if (e.key === '(' || e.key === ')') {
        e.preventDefault();
        handleParenthesesSmart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleDigit,
    handleOperator,
    handleEvaluate,
    handleBackspace,
    handleClear,
    handlePercentage,
    handleParenthesesSmart,
  ]);

  const isLight = theme === 'light';

  // Helper to format equation string with Indian commas
  function formatEquationString(str: string): string {
    const regex = /(\d+\.?\d*|[+\−\×\÷\*\/\-\^%()])/g;
    const tokens = str.match(regex) || [str];
    return tokens
      .map((tok) => {
        if (/^\d+\.?\d*$/.test(tok)) {
          return formatIndianNumber(tok);
        }
        return tok === '*' ? '×' : tok === '/' ? '÷' : tok === '-' ? '−' : tok;
      })
      .join('');
  }

  // Render the equation with vibrant green operators matching the screenshot
  const renderFormattedEquation = (eqStr: string) => {
    if (!eqStr || eqStr === '0') {
      return (
        <span className="inline-flex items-center">
          <span>0</span>
          <span className="w-[3px] h-10 sm:h-12 bg-[#2ebd59] inline-block ml-1 rounded-full animate-pulse shrink-0 align-middle" />
        </span>
      );
    }

    const regex = /(\d+\.?\d*|[+\−\×\÷\*\/\-\^%()])/g;
    const tokens = eqStr.match(regex) || [eqStr];

    return (
      <span className="inline-flex items-center flex-wrap justify-end">
        {tokens.map((token, idx) => {
          if (/^\d+\.?\d*$/.test(token)) {
            return (
              <span key={idx} className={isLight ? 'text-[#222222]' : 'text-white'}>
                {formatIndianNumber(token)}
              </span>
            );
          } else if (['+', '−', '×', '÷', '-', '*', '/'].includes(token)) {
            const displayOp = token === '*' ? '×' : token === '/' ? '÷' : token === '-' ? '−' : token;
            return (
              <span key={idx} className="text-[#2ebd59] font-normal mx-0.5">
                {displayOp}
              </span>
            );
          } else {
            return (
              <span key={idx} className={isLight ? 'text-[#7e7e82]' : 'text-stone-400'}>
                {token}
              </span>
            );
          }
        })}
      </span>
    );
  };

  return (
    <div
      className={`w-full h-full h-dvh flex flex-col justify-between select-none px-4 sm:px-6 pt-safe pb-safe pb-3 max-w-md mx-auto transition-colors duration-150 ${
        isLight ? 'bg-white text-[#1c1c1e]' : 'bg-[#121212] text-white'
      }`}
    >
      {/* DIRECT IN-CALCULATOR PAYMENT RECEIVED OVERLAY CARD */}
      {directPaymentAlert && (
        <div className="absolute inset-x-2 sm:inset-x-4 top-2 z-50 p-1 animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-emerald-300 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-15 pointer-events-none">
              <Sparkles className="w-28 h-28 text-white" />
            </div>

            <div className="flex items-center justify-between pb-1 border-b border-emerald-500/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping inline-block" />
                <span>Google Pay પેમેન્ટ સીધું પ્રાપ્ત થયું!</span>
              </div>
              <button
                onClick={() => setDirectPaymentAlert(null)}
                className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block">
                  જમા થયેલી રકમ (Amount Received)
                </span>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-0.5">
                  ₹{directPaymentAlert.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
            </div>

            <div className="bg-black/25 backdrop-blur-xs rounded-xl p-2.5 text-[11px] flex flex-col gap-1 border border-white/10 font-mono">
              <div className="flex justify-between text-emerald-100">
                <span>ગ્રાહક:</span>
                <span className="font-bold text-white">{directPaymentAlert.customerName}</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>UPI Ref (UTR):</span>
                <span className="font-bold text-white">{directPaymentAlert.utr}</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>રિમાર્ક:</span>
                <span className="font-bold text-emerald-200">{directPaymentAlert.note || 'GROCERY BILL'}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSoundboxPlaying(true);
                playGooglePaySoundbox(directPaymentAlert.amount).finally(() => setIsSoundboxPlaying(false));
              }}
              disabled={isSoundboxPlaying}
              className="w-full py-1.5 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSoundboxPlaying ? '🔊 અવાજ વાગી રહ્યો છે...' : '🔊 ફરી સાઉન્ડબોક્સ અવાજ સાંભળો'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setEquation('0');
                  setDirectPaymentAlert(null);
                }}
                className="py-2.5 px-2 rounded-xl bg-white hover:bg-stone-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                <span>નવો હિસાબ (Clear)</span>
              </button>

              <button
                onClick={() => {
                  const toAdd = directPaymentAlert.amount.toString();
                  setEquation((prev) => (prev && prev !== '0' ? `${prev}+${toAdd}` : toAdd));
                  setDirectPaymentAlert(null);
                }}
                className="py-2.5 px-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-400/40 shadow-sm active:scale-95 transition-all text-center"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-300" />
                <span>+ કેલ્સીમાં ઉમેરો</span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `🧾 *Google Pay Payment Receipt / પહોંચ*\n` +
                  `💰 રકમ: *₹${directPaymentAlert.amount.toFixed(2)}*\n` +
                  `👤 ગ્રાહક: *${directPaymentAlert.customerName}*\n` +
                  `🆔 UPI Ref: *${directPaymentAlert.utr}*\n` +
                  `🏷️ રિમાર્ક: *${directPaymentAlert.note}*\n` +
                  `📅 સમય: *${new Date(directPaymentAlert.timestamp).toLocaleString('gu-IN')}*\n` +
                  `✅ સ્ટેટસ: *સફળતાપૂર્વક જમા (PAID)*\n\n` +
                  `_Google Pay for Business તરફથી આભાર._`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp પર પહોંચ (Receipt) મોકલો</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar: Google Pay Business & Theme */}
      <div className="w-full pt-1.5 px-0.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Google Pay for Business Button */}
          <button
            onClick={handleTriggerUpiQr}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition-all active:scale-95 shadow-2xs ${
              isLight
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-400 border border-blue-800/40'
            }`}
            title="Google Pay for Business Payment QR"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8.5px] font-black">
              G
            </div>
            <span>GPay QR</span>
          </button>
        </div>

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isLight ? 'text-stone-500 hover:text-stone-800 hover:bg-black/5' : 'text-stone-400 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        )}
      </div>

      {/* 1. TOP DISPLAY AREA: PRESERVES ONGOING CALCULATION (e.g. 500+) WHILE VIEWING HISTORY */}
      <div className="flex-1 flex flex-col justify-end px-2 pt-6 pb-2 min-h-[170px]">
        {/* Error message if any */}
        {errorMessage && (
          <div className="text-right text-xs text-rose-500 font-medium py-1 animate-pulse">
            {errorMessage}
          </div>
        )}

        {/* Line 1: Main Expression: 500+ with green + operator (or any ongoing calculation) */}
        <div className="text-right text-4xl sm:text-5xl font-light tracking-tight overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          {renderFormattedEquation(equation)}
        </div>

        {/* Line 2: Live Computed Result (e.g. 500 or calculated subtotal) */}
        {liveResult ? (
          <div
            className={`text-right text-2xl sm:text-3xl font-normal tracking-tight mt-2 mb-1 overflow-x-auto whitespace-nowrap scrollbar-none ${
              isLight ? 'text-[#222222]' : 'text-stone-200'
            }`}
          >
            {formatIndianNumber(liveResult)}
          </div>
        ) : (
          <div className="h-7 sm:h-9" />
        )}
      </div>

      {/* 2. Middle Toolbar Row: 4 Icons exactly as in Screenshot */}
      <div className="w-full">
        <div className="py-2 px-1 flex items-center justify-between text-[#7e7e82]">
          {/* Icon 1: Calculator Keypad Icon (when history open) OR Clock Icon (when history closed) */}
          <button
            onClick={() => setIsInlineHistoryOpen(!isInlineHistoryOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-black/10 text-[#7e7e82]"
            title={isInlineHistoryOpen ? 'Show Keypad' : 'Show History'}
          >
            {isInlineHistoryOpen ? (
              /* EXACT Calculator Keypad Icon from screenshot */
              <div className="w-[20px] h-[20px] border-[1.75px] border-[#7e7e82] rounded-[4px] p-[2.5px] flex flex-col justify-between">
                <div className="w-full h-[3px] bg-[#7e7e82] rounded-[1px]" />
                <div className="grid grid-cols-3 gap-[2px] w-full pt-[1.5px]">
                  <div className="w-[2.5px] h-[2.5px] bg-[#7e7e82] rounded-full" />
                  <div className="w-[2.5px] h-[2.5px] bg-[#7e7e82] rounded-full" />
                  <div className="w-[2.5px] h-[2.5px] bg-[#7e7e82] rounded-full" />
                  <div className="w-[2.5px] h-[2.5px] bg-[#7e7e82] rounded-full" />
                  <div className="w-[2.5px] h-[2.5px] bg-[#7e7e82] rounded-full" />
                  <div className="w-[2.5px] h-[2.5px] bg-[#7e7e82] rounded-full" />
                </div>
              </div>
            ) : (
              /* Clock Icon */
              <svg className="w-6 h-6 stroke-[1.75]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </button>

          {/* Icon 2: Ruler (Unit Converter) */}
          <button
            onClick={onOpenConverter}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-black/10 text-[#7e7e82]"
            title="Unit Converter"
          >
            <Ruler className="w-5 h-5 stroke-[1.75]" />
          </button>

          {/* Icon 3: Scientific Function Icon (Square with √π and e=) */}
          <button
            onClick={() => setIsScientificOpen(!isScientificOpen)}
            className={`w-10 h-10 flex items-center justify-center rounded-full active:bg-black/10 ${
              isScientificOpen ? 'text-[#2ebd59] bg-[#2ebd59]/10' : 'text-[#7e7e82]'
            }`}
            title="Scientific Functions"
          >
            <div className="w-[22px] h-[22px] border-[1.75px] border-current rounded-[4.5px] flex flex-col items-center justify-center text-[7px] font-mono leading-none font-bold">
              <span>√π</span>
              <span className="mt-[1px]">e=</span>
            </div>
          </button>

          {/* Icon 4: Green Backspace Icon (Outline tag with × inside) */}
          <button
            onClick={handleBackspace}
            className="w-10 h-10 flex items-center justify-center rounded-full active:opacity-50 text-[#2ebd59]"
            title="Backspace"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0 2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        </div>

        {/* Thin horizontal separator line from screenshot */}
        <div className={`w-full h-px ${isLight ? 'bg-[#f0f0f2]' : 'bg-[#262626]'}`} />
      </div>

      {/* Collapsible Scientific Row */}
      {isScientificOpen && (
        <div className="py-2 grid grid-cols-5 gap-2 animate-in fade-in duration-150">
          {['sin', 'cos', 'tan', 'ln', 'log'].map((fn) => (
            <button
              key={fn}
              onClick={() => {
                triggerFeedback();
                setEquation((prev) => (prev === '0' ? `${fn}(` : `${prev}${fn}(`));
              }}
              className="h-9 rounded-lg font-medium text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 active:scale-95 transition-all"
            >
              {fn}
            </button>
          ))}
        </div>
      )}

      {/* 3. Bottom Section: EXACT 4-COLUMN SPLIT (Keypad or Inline History) */}
      <div className="pt-3 pb-2 w-full grid grid-cols-4 gap-3 sm:gap-4">
        {isInlineHistoryOpen ? (
          /* ========================================================================= */
          /* INLINE HISTORY VIEW: VIEWING NEVER REMOVES ONGOING INPUT (500+)            */
          /* ========================================================================= */
          <>
            {/* Left 3 Columns: Scrollable history list + Clear history pill */}
            <div
              className={`col-span-3 flex flex-col justify-between pr-4 border-r h-[380px] sm:h-[420px] ${
                isLight ? 'border-[#f0f0f2]' : 'border-[#262626]'
              }`}
            >
              {/* Scrollable calculation items: Touch-scroll safe */}
              <div
                onTouchStart={(e) => {
                  touchStartYRef.current = e.touches[0].clientY;
                  isScrollingRef.current = false;
                }}
                onTouchMove={(e) => {
                  if (touchStartYRef.current !== null) {
                    const deltaY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
                    if (deltaY > 6) {
                      isScrollingRef.current = true;
                    }
                  }
                }}
                onTouchEnd={() => {
                  setTimeout(() => {
                    isScrollingRef.current = false;
                    touchStartYRef.current = null;
                  }, 120);
                }}
                className="flex-1 overflow-y-auto space-y-5 py-2 pr-1 scrollbar-none flex flex-col justify-start"
              >
                {history.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <span className="text-sm text-stone-400">No history</span>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistoryItem(item)}
                      className="cursor-pointer text-right group active:scale-[0.98] transition-transform select-none"
                    >
                      {/* Expression in dark grey/charcoal */}
                      <div
                        className={`text-[17px] sm:text-[18px] font-normal tracking-normal leading-snug ${
                          isLight ? 'text-[#333333]' : 'text-stone-300'
                        }`}
                      >
                        {item.expression}
                      </div>
                      {/* Result in signature vibrant emerald green: =274 */}
                      <div className="text-[21px] sm:text-[23px] font-normal text-[#2ebd59] mt-0.5 tracking-normal leading-tight">
                        ={formatIndianNumber(item.result)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom-left: Clear history */}
              <div className="pt-3 pb-1 flex items-center justify-start">
                {history.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className={`px-5 py-2.5 rounded-full font-medium text-xs active:scale-95 transition-all shadow-xs ${
                      isLight
                        ? 'bg-[#ececef] hover:bg-[#e2e2e7] text-[#1c1c1e]'
                        : 'bg-[#262628] hover:bg-[#323235] text-white'
                    }`}
                  >
                    Clear history
                  </button>
                )}
              </div>
            </div>

            {/* Right 1 Column: Exactly 5 Vertically Stacked Round Buttons (÷, ×, −, +, =) */}
            <div className="col-span-1 flex flex-col justify-between h-[380px] sm:h-[420px]">
              {/* Divide */}
              <button
                onClick={() => handleOperator('÷')}
                className="aspect-square w-full rounded-full active:bg-[#626266] text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] text-white"
                title="Divide"
              >
                ÷
              </button>

              {/* Multiply */}
              <button
                onClick={() => handleOperator('×')}
                className="aspect-square w-full rounded-full active:bg-[#626266] text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] text-white"
                title="Multiply"
              >
                ×
              </button>

              {/* Subtract */}
              <button
                onClick={() => handleOperator('−')}
                className="aspect-square w-full rounded-full active:bg-[#626266] text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] text-white"
                title="Subtract"
              >
                −
              </button>

              {/* Add */}
              <button
                onClick={() => handleOperator('+')}
                className="aspect-square w-full rounded-full active:bg-[#626266] text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] text-white"
                title="Add"
              >
                +
              </button>

              {/* Equals (Vibrant Green Circle) */}
              <button
                onClick={handleEvaluate}
                className="aspect-square w-full rounded-full active:bg-[#259b48] text-4xl sm:text-5xl font-light flex items-center justify-center bg-[#2ebd59] text-white shadow-xs"
                title="Equals"
              >
                =
              </button>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* NORMAL NUMERIC KEYPAD VIEW                                                */
          /* ========================================================================= */
          <>
            {/* Row 1: C, ( ), %, ÷ */}
            <button
              onClick={handleClear}
              className={`aspect-square rounded-full text-2xl sm:text-3xl font-normal flex items-center justify-center ${
                isLight ? 'bg-[#f0f0f2] active:bg-[#dcdce0] text-[#1c1c1e]' : 'bg-[#262628] active:bg-[#343438] text-white'
              }`}
            >
              C
            </button>
            <button
              onClick={handleParenthesesSmart}
              className={`aspect-square rounded-full text-2xl sm:text-3xl font-normal flex items-center justify-center ${
                isLight ? 'bg-[#f0f0f2] active:bg-[#dcdce0] text-[#1c1c1e]' : 'bg-[#262628] active:bg-[#343438] text-white'
              }`}
            >
              ( )
            </button>
            <button
              onClick={handlePercentage}
              className={`aspect-square rounded-full text-2xl sm:text-3xl font-normal flex items-center justify-center ${
                isLight ? 'bg-[#f0f0f2] active:bg-[#dcdce0] text-[#1c1c1e]' : 'bg-[#262628] active:bg-[#343438] text-white'
              }`}
            >
              %
            </button>
            <button
              onClick={() => handleOperator('÷')}
              className="aspect-square rounded-full text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] active:bg-[#626266] text-white"
            >
              ÷
            </button>

            {/* Row 2: 7, 8, 9, × */}
            <button
              onClick={() => handleDigit('7')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              7
            </button>
            <button
              onClick={() => handleDigit('8')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              8
            </button>
            <button
              onClick={() => handleDigit('9')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              9
            </button>
            <button
              onClick={() => handleOperator('×')}
              className="aspect-square rounded-full text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] active:bg-[#626266] text-white"
            >
              ×
            </button>

            {/* Row 3: 4, 5, 6, − */}
            <button
              onClick={() => handleDigit('4')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              4
            </button>
            <button
              onClick={() => handleDigit('5')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              5
            </button>
            <button
              onClick={() => handleDigit('6')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              6
            </button>
            <button
              onClick={() => handleOperator('−')}
              className="aspect-square rounded-full text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] active:bg-[#626266] text-white"
            >
              −
            </button>

            {/* Row 4: 1, 2, 3, + */}
            <button
              onClick={() => handleDigit('1')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              1
            </button>
            <button
              onClick={() => handleDigit('2')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              2
            </button>
            <button
              onClick={() => handleDigit('3')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              3
            </button>
            <button
              onClick={() => handleOperator('+')}
              className="aspect-square rounded-full text-3xl sm:text-4xl font-light flex items-center justify-center bg-[#7e7e82] active:bg-[#626266] text-white"
            >
              +
            </button>

            {/* Row 5: GPay QR, 0, ., = */}
            <button
              onClick={handleTriggerUpiQr}
              className={`aspect-square rounded-full flex flex-col items-center justify-center ${
                isLight ? 'bg-blue-50/70 active:bg-blue-100 text-blue-700' : 'bg-[#1e1e20] active:bg-[#2c2c30] text-blue-400'
              }`}
              title="Google Pay for Business QR"
            >
              <QrCode className="w-6 h-6 stroke-[2]" />
              <span className="text-[10px] font-bold leading-none mt-0.5">GPay</span>
            </button>
            <button
              onClick={() => handleDigit('0')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-normal flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              0
            </button>
            <button
              onClick={() => handleDigit('.')}
              className={`aspect-square rounded-full text-3xl sm:text-4xl font-bold flex items-center justify-center ${
                isLight ? 'bg-white active:bg-[#e4e4e8] text-[#1c1c1e]' : 'bg-[#1e1e20] active:bg-[#303034] text-white'
              }`}
            >
              .
            </button>
            <button
              onClick={handleEvaluate}
              className="aspect-square rounded-full text-4xl sm:text-5xl font-light flex items-center justify-center bg-[#2ebd59] active:bg-[#259b48] text-white shadow-xs"
            >
              =
            </button>
          </>
        )}
      </div>
    </div>
  );
};
