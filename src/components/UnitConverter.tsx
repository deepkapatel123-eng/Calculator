import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Copy,
  Check,
  Ruler,
  Scale,
  Thermometer,
  Droplet,
  Maximize2,
  Gauge,
  Clock,
  HardDrive,
  PlusCircle,
  HelpCircle,
  X,
  CornerDownRight,
  Download,
} from 'lucide-react';
import { UNIT_CATEGORIES, convertUnits } from '../utils/unitsData';
import { UnitCategoryKey, HistoryItem } from '../types';
import { formatResultNumber } from '../utils/calculatorEngine';

interface UnitConverterProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  onClose?: () => void;
  onSelectResult?: (val: string) => void;
  onOpenApkModal?: () => void;
}

const CATEGORY_ICONS: Record<UnitCategoryKey, React.ReactNode> = {
  length: <Ruler className="w-4 h-4" />,
  weight: <Scale className="w-4 h-4" />,
  temperature: <Thermometer className="w-4 h-4" />,
  volume: <Droplet className="w-4 h-4" />,
  area: <Maximize2 className="w-4 h-4" />,
  speed: <Gauge className="w-4 h-4" />,
  time: <Clock className="w-4 h-4" />,
  digital: <HardDrive className="w-4 h-4" />,
};

export const UnitConverter: React.FC<UnitConverterProps> = ({
  onAddHistory,
  onClose,
  onSelectResult,
  onOpenApkModal,
}) => {
  const [activeCategoryKey, setActiveCategoryKey] = useState<UnitCategoryKey>('length');
  const [inputValue, setInputValue] = useState<string>('1');

  const activeCategory = useMemo(() => {
    return UNIT_CATEGORIES.find((c) => c.id === activeCategoryKey) || UNIT_CATEGORIES[0];
  }, [activeCategoryKey]);

  // Default from/to units when category changes
  const [fromUnitId, setFromUnitId] = useState<string>(activeCategory.units[0].id);
  const [toUnitId, setToUnitId] = useState<string>(
    activeCategory.units[1] ? activeCategory.units[1].id : activeCategory.units[0].id
  );

  const [copied, setCopied] = useState<boolean>(false);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);

  // Switch category
  const handleCategoryChange = (catKey: UnitCategoryKey) => {
    setActiveCategoryKey(catKey);
    const newCategory = UNIT_CATEGORIES.find((c) => c.id === catKey) || UNIT_CATEGORIES[0];
    setFromUnitId(newCategory.units[0].id);
    setToUnitId(newCategory.units[1] ? newCategory.units[1].id : newCategory.units[0].id);
  };

  // Convert
  const parsedInput = parseFloat(inputValue);
  const isValidNumber = !isNaN(parsedInput);

  const conversion = useMemo(() => {
    if (!isValidNumber) return { result: 0, formula: '' };
    return convertUnits(activeCategoryKey, fromUnitId, toUnitId, parsedInput);
  }, [activeCategoryKey, fromUnitId, toUnitId, parsedInput, isValidNumber]);

  const formattedOutput = isValidNumber ? formatResultNumber(conversion.result) : '0';

  const fromUnitObj = activeCategory.units.find((u) => u.id === fromUnitId);
  const toUnitObj = activeCategory.units.find((u) => u.id === toUnitId);

  // Swap units
  const handleSwap = () => {
    const currentFrom = fromUnitId;
    const currentTo = toUnitId;
    setFromUnitId(currentTo);
    setToUnitId(currentFrom);
  };

  // Copy result
  const handleCopy = () => {
    navigator.clipboard.writeText(`${formattedOutput} ${toUnitObj?.symbol || ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save to history log
  const handleSaveToHistory = () => {
    if (!isValidNumber) return;
    const fromSymbol = fromUnitObj?.symbol || fromUnitId;
    const toSymbol = toUnitObj?.symbol || toUnitId;
    const expr = `${inputValue} ${fromSymbol} → ${toSymbol}`;

    onAddHistory({
      type: 'conversion',
      expression: expr,
      result: `${formattedOutput} ${toSymbol}`,
      category: activeCategory.name,
      details: conversion.formula,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  // Multi-unit comparison list
  const allConversions = useMemo(() => {
    if (!isValidNumber) return [];
    return activeCategory.units.map((u) => {
      const conv = convertUnits(activeCategoryKey, fromUnitId, u.id, parsedInput);
      return {
        unit: u,
        value: formatResultNumber(conv.result),
        isCurrentTarget: u.id === toUnitId,
      };
    });
  }, [activeCategory, activeCategoryKey, fromUnitId, toUnitId, parsedInput, isValidNumber]);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 bg-[#121214] p-5 sm:p-6 rounded-3xl shadow-2xl border border-[#222224] text-stone-200 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222224]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-[#2ebd59] border border-emerald-800/40 flex items-center justify-center font-bold">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-none">Unit Converter</h2>
            <p className="text-xs text-stone-400 mt-0.5">Real-time measurement conversions</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenApkModal && (
            <button
              id="converter-download-apk-btn"
              onClick={onOpenApkModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-[#2ebd59] border border-emerald-800/40 transition-colors"
              title="Download App / APK"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] flex items-center justify-center text-stone-400 hover:text-white transition-colors"
              title="Close converter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {UNIT_CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategoryKey;
          return (
            <button
              key={cat.id}
              id={`cat-tab-${cat.id}`}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#2ebd59] text-white border-[#2ebd59] shadow-xs'
                  : 'bg-[#1c1c1e] hover:bg-[#28282a] text-stone-400 hover:text-white border-[#2c2c2e]'
              }`}
            >
              {CATEGORY_ICONS[cat.id]}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Converter Card */}
      <div className="bg-[#18181b] rounded-2xl border border-[#27272a] p-4 sm:p-5 flex flex-col gap-4">
        {/* Presets Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-medium text-stone-400">Quick values:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 5, 10, 50, 100, 1000].map((preset) => (
              <button
                key={preset}
                onClick={() => setInputValue(preset.toString())}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors border ${
                  inputValue === preset.toString()
                    ? 'bg-emerald-950/60 text-[#2ebd59] border-emerald-700/50'
                    : 'bg-[#1c1c1e] text-stone-400 hover:bg-[#28282a] hover:text-white border-[#2c2c2e]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Converter Form */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-3">
          {/* From Side */}
          <div className="bg-[#1c1c1e] rounded-xl border border-[#2c2c2e] p-3.5 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>From</span>
              <span className="font-mono font-semibold text-stone-300">{fromUnitObj?.symbol}</span>
            </div>
            <input
              id="converter-input-value"
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-2xl font-bold font-mono text-white outline-none"
            />
            <select
              id="converter-from-unit-select"
              value={fromUnitId}
              onChange={(e) => setFromUnitId(e.target.value)}
              aria-label="Source unit"
              className="w-full bg-[#121214] border border-[#2c2c2e] text-stone-200 text-xs rounded-lg py-1.5 px-2.5 font-medium outline-none focus:border-[#2ebd59] cursor-pointer"
            >
              {activeCategory.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              id="converter-swap-btn"
              onClick={handleSwap}
              className="w-10 h-10 rounded-xl bg-[#2c2c2e] hover:bg-[#38383a] text-stone-300 hover:text-white border border-[#3a3a3c] flex items-center justify-center transition-all shadow-xs active:scale-90"
              title="Swap units"
            >
              <ArrowUpDown className="w-4 h-4 md:rotate-90" />
            </button>
          </div>

          {/* To Side */}
          <div className="bg-[#1c1c1e] rounded-xl border border-[#2c2c2e] p-3.5 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>To (Result)</span>
              <span className="font-mono font-semibold text-[#2ebd59]">{toUnitObj?.symbol}</span>
            </div>
            <div className="w-full text-2xl font-bold font-mono text-[#2ebd59] truncate py-0.5">
              {formattedOutput}
            </div>
            <select
              id="converter-to-unit-select"
              value={toUnitId}
              onChange={(e) => setToUnitId(e.target.value)}
              aria-label="Target unit"
              className="w-full bg-[#121214] border border-[#2c2c2e] text-stone-200 text-xs rounded-lg py-1.5 px-2.5 font-medium outline-none focus:border-[#2ebd59] cursor-pointer"
            >
              {activeCategory.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formula details & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#27272a]">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 bg-[#1c1c1e] px-2.5 py-1.5 rounded-lg border border-[#2c2c2e]">
            <HelpCircle className="w-3.5 h-3.5 text-[#2ebd59] shrink-0" />
            <span className="font-mono text-[11px] truncate">{conversion.formula || 'Direct conversion'}</span>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            {onSelectResult && (
              <button
                onClick={() => {
                  onSelectResult(formattedOutput);
                  if (onClose) onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2c2c2e] hover:bg-[#38383a] text-stone-200 text-xs font-semibold transition-colors border border-[#3a3a3c]"
                title="Send result into calculator"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Use</span>
              </button>
            )}

            <button
              id="converter-copy-btn"
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2c2c2e] hover:bg-[#38383a] text-stone-200 text-xs font-semibold transition-colors border border-[#3a3a3c]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2ebd59]" />
                  <span className="text-[#2ebd59]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              id="converter-save-history-btn"
              onClick={handleSaveToHistory}
              disabled={!isValidNumber}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#2ebd59] hover:bg-[#28aa4f] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40"
            >
              {addedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Save History</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Unit Overview Grid */}
      <div className="bg-[#18181b] rounded-2xl border border-[#27272a] p-3.5 flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          All {activeCategory.name} Conversions for {inputValue || '0'} {fromUnitObj?.symbol}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allConversions.map((conv) => (
            <button
              key={conv.unit.id}
              onClick={() => setToUnitId(conv.unit.id)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                conv.isCurrentTarget
                  ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300'
                  : 'bg-[#1c1c1e] hover:bg-[#28282a] border-[#2c2c2e] text-stone-300'
              }`}
            >
              <span className="text-[10px] text-stone-400 truncate">{conv.unit.name}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono font-bold text-xs text-white truncate">
                  {conv.value}
                </span>
                <span className="font-mono text-[11px] text-[#2ebd59]">{conv.unit.symbol}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
