import React from 'react';
import { Calculator as CalcIcon, Ruler, History, QrCode } from 'lucide-react';

interface HeaderProps {
  activeTab: 'calculator' | 'converter';
  onTabChange: (tab: 'calculator' | 'converter') => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  historyCount: number;
  onOpenUpiQr?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isHistoryOpen,
  onToggleHistory,
  historyCount,
  onOpenUpiQr,
}) => {
  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-stone-200 text-stone-800 py-2.5 px-4 sm:px-6 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* App Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs font-semibold">
            <CalcIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-stone-900 flex items-center gap-1.5">
              Calculator
            </h1>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Mobile Calculator &amp; UPI VPA QR Generator
            </p>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick UPI QR button */}
          {onOpenUpiQr && (
            <button
              id="header-upi-qr-btn"
              onClick={onOpenUpiQr}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 text-xs font-semibold transition-colors shadow-2xs"
              title="Generate UPI QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xs:inline">UPI QR</span>
            </button>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-medium">
            <button
              id="tab-calculator-btn"
              onClick={() => onTabChange('calculator')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeTab === 'calculator'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <CalcIcon className="w-3.5 h-3.5" />
              <span>Calculator</span>
            </button>
            <button
              id="tab-converter-btn"
              onClick={() => onTabChange('converter')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeTab === 'converter'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Converter</span>
            </button>
          </div>

          {/* History Toggle Button */}
          <button
            id="toggle-history-btn"
            onClick={onToggleHistory}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-medium ${
              isHistoryOpen
                ? 'bg-stone-900 border-stone-900 text-white'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900'
            }`}
            title="Toggle Calculation History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="min-w-[1.15rem] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {historyCount > 99 ? '99+' : historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
