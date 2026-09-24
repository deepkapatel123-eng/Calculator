import { useState, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Calculator } from './components/Calculator';
import { UnitConverter } from './components/UnitConverter';
import { UpiQrModal } from './components/UpiQrModal';
import { ApkDownloadModal } from './components/ApkDownloadModal';
import { PaymentHistoryModal } from './components/PaymentHistoryModal';
import { HistoryItem, PaymentTransaction } from './types';

const STORAGE_KEY = 'calculator_app_history_v3';
const THEME_STORAGE_KEY = 'calculator_app_theme_v3';
const PAYMENTS_STORAGE_KEY = 'gpay_received_payments_v3';

// Sample calculations matching user screenshot
const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'hist-1',
    type: 'arithmetic',
    expression: '140+13+53+68',
    result: '274',
    timestamp: Date.now() - 1000 * 60 * 3,
  },
  {
    id: 'hist-2',
    type: 'arithmetic',
    expression: '220+225',
    result: '445',
    timestamp: Date.now() - 1000 * 60 * 10,
  },
  {
    id: 'hist-3',
    type: 'arithmetic',
    expression: '70+70+50+100',
    result: '290',
    timestamp: Date.now() - 1000 * 60 * 25,
  },
  {
    id: 'hist-4',
    type: 'arithmetic',
    expression: '306+108+104',
    result: '518',
    timestamp: Date.now() - 1000 * 60 * 45,
  },
  {
    id: 'hist-5',
    type: 'arithmetic',
    expression: '150+55+70+70+40',
    result: '385',
    timestamp: Date.now() - 1000 * 60 * 90,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'converter'>('calculator');
  const [externalInsertValue, setExternalInsertValue] = useState<string | null>(null);

  // Theme state: 'light' (default as per user screenshot) or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Update native status bar whenever theme changes
  useEffect(() => {
    const applyStatusBar = async () => {
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
        // Safe fallback in web browsers
      }
    };
    applyStatusBar();
  }, [theme]);

  // UPI QR Modal state
  const [isUpiQrOpen, setIsUpiQrOpen] = useState<boolean>(false);
  const [upiAmount, setUpiAmount] = useState<string>('0');

  // APK Download / Install Modal state
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);

  // Received Payments Ledger state
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState<boolean>(false);
  const [payments, setPayments] = useState<PaymentTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const handlePaymentReceived = useCallback((tx: PaymentTransaction) => {
    setPayments((prev) => {
      const updated = [tx, ...prev.filter((p) => p.orderId !== tx.orderId)];
      try {
        localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const handleClearPayments = useCallback(() => {
    setPayments([]);
    try {
      localStorage.removeItem(PAYMENTS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // History state with localStorage synchronization
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_HISTORY;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // localStorage may fail in restricted sandboxes
    }
  }, [history]);

  // Add item to history
  const handleAddHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 99)]);
  };

  // Clear history
  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Use a past result inside the calculator
  const handleSelectResult = (val: string) => {
    const match = val.match(/^-?\d+(\.\d+)?/);
    const cleanNum = match ? match[0] : val;
    setExternalInsertValue(cleanNum);
    setActiveTab('calculator');
  };

  // Open UPI QR code modal with a specific amount
  const handleOpenUpiQr = useCallback((amount?: string) => {
    setUpiAmount(amount || '0');
    setIsUpiQrOpen(true);
    try {
      window.history.pushState({ modal: 'upiQr' }, '');
    } catch {
      // ignore
    }
  }, []);

  const handleOpenConverter = useCallback(() => {
    setActiveTab('converter');
    try {
      window.history.pushState({ modal: 'converter' }, '');
    } catch {
      // ignore
    }
  }, []);

  const handleOpenApkModal = useCallback(() => {
    setIsApkModalOpen(true);
    try {
      window.history.pushState({ modal: 'apk' }, '');
    } catch {
      // ignore
    }
  }, []);

  // Return to home calculator screen when back button is triggered
  const handleGoToHomeScreen = useCallback(() => {
    let handled = false;
    if (isPaymentHistoryOpen) {
      setIsPaymentHistoryOpen(false);
      handled = true;
    }
    if (isUpiQrOpen) {
      setIsUpiQrOpen(false);
      handled = true;
    }
    if (isApkModalOpen) {
      setIsApkModalOpen(false);
      handled = true;
    }
    if (activeTab === 'converter') {
      setActiveTab('calculator');
      handled = true;
    }
    return handled;
  }, [isPaymentHistoryOpen, isUpiQrOpen, isApkModalOpen, activeTab]);

  // Native Android Hardware / Gesture Back Button Listener
  useEffect(() => {
    let backListenerHandle: any = null;

    const setupBackButtonListener = async () => {
      try {
        backListenerHandle = await CapApp.addListener('backButton', () => {
          // If any modal (QR code, APK) or Converter is open, return to Home Screen!
          const wasModalOpen = handleGoToHomeScreen();
          if (!wasModalOpen) {
            // Already on home screen with no modals: exit the app
            CapApp.exitApp();
          }
        });
      } catch {
        // Ignored when running in standard web browser
      }
    };

    setupBackButtonListener();

    return () => {
      if (backListenerHandle && typeof backListenerHandle.remove === 'function') {
        backListenerHandle.remove();
      }
    };
  }, [handleGoToHomeScreen]);

  // Browser / Mobile Swipe Navigation PopState Listener
  useEffect(() => {
    const handlePopState = () => {
      handleGoToHomeScreen();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleGoToHomeScreen]);

  return (
    <div
      className={`w-full h-full h-dvh flex flex-col justify-between items-center font-sans overflow-hidden select-none transition-colors duration-200 ${
        theme === 'light' ? 'bg-white text-[#1c1c1e]' : 'bg-black text-white'
      }`}
    >
      {/* Main Workspace Area: Full Screen */}
      <main className="w-full h-full flex flex-col items-center justify-between overflow-hidden">
        {activeTab === 'calculator' ? (
          <div className="w-full h-full flex flex-col justify-between">
            <Calculator
              onAddHistory={handleAddHistory}
              externalInsertValue={externalInsertValue}
              onClearExternalInsert={() => setExternalInsertValue(null)}
              onOpenConverter={handleOpenConverter}
              onOpenUpiQr={(amt) => handleOpenUpiQr(amt)}
              onOpenApkModal={handleOpenApkModal}
              onOpenPaymentHistory={() => setIsPaymentHistoryOpen(true)}
              onDirectPaymentReceived={handlePaymentReceived}
              paymentsCount={payments.filter((p) => p.status === 'SUCCESS').length}
              history={history}
              onClearHistory={handleClearHistory}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
          </div>
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto ${
              theme === 'light' ? 'bg-[#f8f9fa]' : 'bg-black'
            }`}
          >
            <UnitConverter
              onAddHistory={handleAddHistory}
              onClose={() => setActiveTab('calculator')}
              onSelectResult={handleSelectResult}
              onOpenApkModal={handleOpenApkModal}
            />
          </div>
        )}
      </main>

      {/* UPI QR Code Generator Modal with Real-time Status */}
      <UpiQrModal
        isOpen={isUpiQrOpen}
        onClose={() => setIsUpiQrOpen(false)}
        calculatedAmount={upiAmount}
        onPaymentReceived={handlePaymentReceived}
        onOpenPaymentHistory={() => setIsPaymentHistoryOpen(true)}
      />

      {/* Received Payments Ledger / History Modal */}
      <PaymentHistoryModal
        isOpen={isPaymentHistoryOpen}
        onClose={() => setIsPaymentHistoryOpen(false)}
        payments={payments}
        onClearHistory={handleClearPayments}
        isLight={theme === 'light'}
      />

      {/* Android App & APK Modal */}
      <ApkDownloadModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}
